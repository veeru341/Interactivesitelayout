import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Role, Status, ToastType, ImageOverlay, Shape, DrawingPoint } from '../types';
import { INITIAL_LAYOUTS } from '../constants';
import Header from './Header';
import MapLayout from './MapLayout';
import PlotDetailsPanel from './PlotDetailsPanel';
import DrawingToolsPanel from './DrawingToolsPanel';
import { CheckCircleIcon } from './icons';
import LayoutDrawingPanel from './LayoutDrawingPanel';

const Toast: React.FC<{ message: string; type: ToastType; onDismiss: () => void; }> = ({ message, type, onDismiss }: { message: string; type: ToastType; onDismiss: () => void; }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';

  return (
    <div 
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center p-4 rounded-lg text-white shadow-2xl ${bgColor} animate-fade-in-down`}
    >
      {type === 'success' && <CheckCircleIcon className="w-6 h-6 mr-3" />}
      <span className="font-semibold">{message}</span>
    </div>
  );
};

interface PlannerAppProps {
  onLogout: () => void;
}

function PlannerApp({ onLogout }: PlannerAppProps): React.ReactNode {
  const [role, setRole] = useState<Role>(Role.Admin);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [flyToTrigger, setFlyToTrigger] = useState<number>(0);
  const [svgOverlays, setSvgOverlays] = useState<ImageOverlay[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });
  // Add state for fixed overlay:
  const [fixedOverlay, setFixedOverlay] = useState<{ id: string; imageUrl?: string; svgContent?: string; position: L.LatLngExpression } | null>(null);
  // Add state for drawing:
  const [showDrawingPanel, setShowDrawingPanel] = useState(false);
  const [drawingLayout, setDrawingLayout] = useState<Layout | null>(null);
  const [layoutCreationImage, setLayoutCreationImage] = useState<string | null>(null);
  // Add state for drawing tools panel:
  const [showDrawingTools, setShowDrawingTools] = useState(false);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const handleMapCenterChange = useCallback((center: any) => {
    if (typeof center === 'object' && 'lat' in center && 'lng' in center) {
      setMapCenter(center as { lat: number; lng: number });
    }
  }, []);

  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem('siteLayouts');
      if (savedLayouts) {
        setLayouts(JSON.parse(savedLayouts));
      } else {
        setLayouts(INITIAL_LAYOUTS);
      }
    } catch (error) {
      console.error("Failed to load layouts from localStorage", error);
      setLayouts(INITIAL_LAYOUTS);
    }
  }, []);

  useEffect(() => {
    try {
      if (layouts.length > 0 || localStorage.getItem('siteLayouts')) {
        localStorage.setItem('siteLayouts', JSON.stringify(layouts));
      }
    } catch (error) {
      console.error("Failed to save layouts to localStorage", error);
    }
  }, [layouts]);

  const handleLayoutSelect = (layout: Layout) => {
    setSelectedLayout(layout);
    setFlyToTrigger((t: number) => t + 1);
  };

  const handleLayoutUpdate = (updatedLayout: Layout) => {
    const newLayouts = layouts.map((p: Layout) => p.id === updatedLayout.id ? updatedLayout : p);
    setLayouts(newLayouts);
    setSelectedLayout(updatedLayout);
    showToast('Layout updated successfully!');
  };

  const handleLayoutDelete = (layoutId: number) => {
    if (window.confirm('Are you sure you want to delete this layout? This action cannot be undone.')) {
      const newLayouts = layouts.filter((l: Layout) => l.id !== layoutId);
      setLayouts(newLayouts);
      if (selectedLayout?.id === layoutId) {
        setSelectedLayout(null);
      }
      showToast('Layout deleted successfully!');
    }
  };
  
  const handleDeselect = () => {
    setSelectedLayout(null);
  }

  const handleDrawingFinish = (latlngs: L.LatLngExpression[]) => {
    const newId = layouts.length > 0 ? Math.max(...layouts.map((l: Layout) => l.id)) + 1 : 1;
    const newLayout: Layout = {
      id: newId,
      name: `New Layout ${newId}`,
      vendorName: 'N/A',
      status: Status.Available,
      latlngs: latlngs,
      plots: [],
    };
    setLayouts((prev: Layout[]) => [...prev, newLayout]);
    setSelectedLayout(newLayout);
    showToast('New layout created successfully!');
  };

  // Handler to add a new SVG overlay
  const handleAddSvgOverlay = (overlay: ImageOverlay) => {
    setSvgOverlays((prev: ImageOverlay[]) => [...prev, overlay]);
  };
  // Handler to update an existing image overlay (for move/resize/rotate)
  const handleUpdateSvgOverlay = (updated: ImageOverlay) => {
    setSvgOverlays((prev: ImageOverlay[]) => prev.map((o: ImageOverlay) => o.id === updated.id ? updated : o));
  };

  const handleCreateLayout = ({ name, vendorName }: { name: string; vendorName: string }) => {
    const newId = layouts.length > 0 ? Math.max(...layouts.map(l => l.id)) + 1 : 1;
    const newLayout = {
      id: newId,
      name,
      vendorName,
      status: Status.Available,
      latlngs: [],
      plots: [],
    };
    setLayouts(prev => [...prev, newLayout]);
  };

  // Add handler to create layout from overlay:
  const handleCreateLayoutFromOverlay = ({ name, vendorName, overlayId }: { name: string; vendorName: string; overlayId: string }) => {
    const overlay = svgOverlays.find(o => o.id === overlayId);
    if (overlay) {
      const newId = layouts.length > 0 ? Math.max(...layouts.map(l => l.id)) + 1 : 1;
      
      // Create a proper polygon boundary around the overlay position
      const position = overlay.position as { lat: number; lng: number };
      const offset = 0.001; // Small offset to create a visible polygon
      const latlngs = [
        [position.lat - offset, position.lng - offset],
        [position.lat - offset, position.lng + offset],
        [position.lat + offset, position.lng + offset],
        [position.lat + offset, position.lng - offset],
      ];
      
      const newLayout = {
        id: newId,
        name,
        vendorName,
        status: Status.Available,
        latlngs: latlngs,
        plots: [],
      };
      setLayouts(prev => [...prev, newLayout]);
      setFixedOverlay(null); // Clear the fixed overlay
      showToast('Layout created from overlay successfully!');
    }
  };

  // Add handler for drawing save:
  const handleDrawingSave = (layoutData: { shapes: Shape[]; drawingPoints: DrawingPoint[] }) => {
    if (drawingLayout) {
      // Update the layout with drawing data
      const updatedLayout = {
        ...drawingLayout,
        // Add drawing data to layout (you can extend the Layout interface if needed)
      };
      handleLayoutUpdate(updatedLayout);
      setShowDrawingPanel(false);
      setDrawingLayout(null);
      showToast('Layout drawing saved successfully!');
    }
  };

  // Add handler to open drawing panel:
  const handleOpenDrawingPanel = (layout: Layout) => {
    setDrawingLayout(layout);
    setShowDrawingPanel(true);
    // Set the drawing image to a placeholder for now
    // In a real app, you'd get the layout's associated image
    setLayoutCreationImage('https://via.placeholder.com/400x300/6b7280/ffffff?text=Layout+Image');
  };

  // Add handler for drawing tools save:
  const handleDrawingToolsSave = (layoutData: { shapes: Shape[]; drawingPoints: DrawingPoint[] }) => {
    // Here you can process the drawing data and create layouts or sub-plots
    console.log('Drawing tools data:', layoutData);
    showToast('Drawing saved successfully!');
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      
      <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50">
        <Header role={role} onRoleChange={setRole} onLogout={onLogout} />
        
        <div className="flex-1 flex">
          {/* Map Area */}
          <div className="flex-1 relative">
            <MapLayout
              layouts={layouts}
              onLayoutSelect={setSelectedLayout}
              selectedLayoutId={selectedLayout?.id}
              onDeselect={() => setSelectedLayout(null)}
              onDrawingFinish={(latlngs) => {
                // Handle drawing finish
                console.log('Drawing finished:', latlngs);
              }}
              isAdmin={role === Role.Admin}
              flyToTrigger={flyToTrigger}
              svgOverlays={svgOverlays}
              onUpdateSvgOverlay={handleUpdateSvgOverlay}
              onMapCenterChange={handleMapCenterChange}
              onFixedOverlayChange={setFixedOverlay}
            />
            
            {/* Drawing Tools Panel */}
            <DrawingToolsPanel
              onSave={handleDrawingToolsSave}
              isVisible={showDrawingTools}
              onToggleVisibility={() => setShowDrawingTools(!showDrawingTools)}
            />
          </div>
          
          {/* Right Panel */}
          <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
            <PlotDetailsPanel
              layout={selectedLayout}
              onUpdate={handleLayoutUpdate}
              onDelete={handleLayoutDelete}
              onClose={() => setSelectedLayout(null)}
              role={role}
              layouts={layouts}
              onLayoutSelect={setSelectedLayout}
              onAddSvgOverlay={handleAddSvgOverlay}
              mapCenter={mapCenter}
              fixedOverlay={fixedOverlay}
              onCreateLayoutFromOverlay={handleCreateLayoutFromOverlay}
              onOpenDrawingPanel={handleOpenDrawingPanel}
            />
          </div>
        </div>
        
        {/* Drawing Panel - Overlay */}
        {showDrawingPanel && drawingLayout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-11/12 h-5/6 max-w-4xl">
              <LayoutDrawingPanel
                backgroundImage={layoutCreationImage || undefined}
                onSave={handleDrawingSave}
                onClose={() => {
                  setShowDrawingPanel(false);
                  setDrawingLayout(null);
                  setLayoutCreationImage(null);
                }}
                isVisible={showDrawingPanel}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default PlannerApp;
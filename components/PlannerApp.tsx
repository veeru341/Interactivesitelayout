import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Role, Status, ToastType, SvgOverlay } from '../types';
import { INITIAL_LAYOUTS } from '../constants';
import Header from './Header';
import MapLayout from './MapLayout';
import PlotDetailsPanel from './PlotDetailsPanel';
import LayoutEditor from './LayoutEditor';
import { CheckCircleIcon } from './icons';

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
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [flyToTrigger, setFlyToTrigger] = useState<number>(0);
  const [svgOverlays, setSvgOverlays] = useState<SvgOverlay[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

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

  const handleEnterEditor = () => {
    if (selectedLayout) {
      setEditingLayout(selectedLayout);
    }
  };

  const handleExitEditor = () => {
    setEditingLayout(null);
    setSelectedLayout(null);
  };

  const handleSaveChangesFromEditor = (updatedLayout: Layout) => {
    setLayouts((prevLayouts: Layout[]) => prevLayouts.map((l: Layout) => l.id === updatedLayout.id ? updatedLayout : l));
    setEditingLayout(null); // Exit editor on save
    showToast('Layout saved successfully!');
  };

  // Handler to add a new SVG overlay
  const handleAddSvgOverlay = (overlay: SvgOverlay) => {
    setSvgOverlays((prev: SvgOverlay[]) => [...prev, overlay]);
  };
  // Handler to update an existing SVG overlay (for move/resize/rotate)
  const handleUpdateSvgOverlay = (updated: SvgOverlay) => {
    setSvgOverlays((prev: SvgOverlay[]) => prev.map((o: SvgOverlay) => o.id === updated.id ? updated : o));
  };

  if (role === Role.Admin && editingLayout) {
    return (
      <LayoutEditor
        key={editingLayout.id}
        initialLayout={editingLayout}
        onSaveChanges={handleSaveChangesFromEditor}
        onExit={handleExitEditor}
      />
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50">
        <Header role={role} onRoleChange={setRole} onLogout={onLogout} />
        <main className="flex-grow flex overflow-hidden">
          <div className="flex-grow relative bg-white dark:bg-slate-900 shadow-lg m-4 rounded-xl">
            <MapLayout 
              layouts={layouts} 
              onLayoutSelect={handleLayoutSelect}
              selectedLayoutId={selectedLayout?.id}
              onDeselect={handleDeselect}
              onDrawingFinish={handleDrawingFinish}
              isAdmin={role === Role.Admin}
              flyToTrigger={flyToTrigger}
              svgOverlays={svgOverlays}
              onUpdateSvgOverlay={handleUpdateSvgOverlay}
              onMapCenterChange={setMapCenter}
            />
          </div>
          <aside className="w-96 flex-shrink-0 bg-white dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50">
            <PlotDetailsPanel
              layout={selectedLayout}
              onUpdate={handleLayoutUpdate}
              onClose={handleDeselect}
              role={role}
              onEnterEditor={handleEnterEditor}
              layouts={layouts}
              onLayoutSelect={handleLayoutSelect}
              onDelete={handleLayoutDelete}
              onAddSvgOverlay={handleAddSvgOverlay}
              mapCenter={mapCenter}
            />
          </aside>
        </main>
      </div>
    </>
  );
}

export default PlannerApp;

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Plot, Status } from '../types';
import { BackIcon, EraserIcon, InfoIcon, PencilIcon, SelectIcon, TagIcon, EditIcon } from './icons';
import { STATUS_HEX_COLORS } from '../constants';

interface LayoutEditorProps {
  initialLayout: Layout;
  onSaveChanges: (updatedLayout: Layout) => void;
  onExit: () => void;
}

type Tool = 'select' | 'draw' | 'erase';

const generateUUID = () => `plot-${Date.now()}-${Math.random()}`;

const LayoutEditor: React.FC<LayoutEditorProps> = ({ initialLayout, onSaveChanges, onExit }) => {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isHoveringOverErasable, setIsHoveringOverErasable] = useState(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const plotsLayerGroup = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroup = useRef<L.LayerGroup | null>(null);

  // Detect if there are any meaningful changes to save.
  useEffect(() => {
    const initialJSON = JSON.stringify(initialLayout.plots || []);
    const currentJSON = JSON.stringify(layout.plots || []);
    setHasChanges(initialJSON !== currentJSON);
  }, [layout, initialLayout]);

  const handleToolSelect = (selectedTool: Tool) => {
    setTool(selectedTool);
    setIsDrawing(selectedTool === 'draw');
    if (selectedTool !== 'draw') {
      setDrawingPoints([]);
    }
  };

  // Effect to initialize the map
  useEffect(() => {
    if (!mapRef.current) return;

    const mapInstance = L.map(mapRef.current, { zoomControl: false }).setView([0,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);
    
    // Add layer groups
    plotsLayerGroup.current = L.layerGroup().addTo(mapInstance);
    drawingLayerGroup.current = L.layerGroup().addTo(mapInstance);

    // Draw parent layout boundary
    const parentBoundary = L.polygon(layout.latlngs, {
      color: '#4f46e5',
      weight: 3,
      fill: false,
      dashArray: '10, 5'
    }).addTo(mapInstance);

    mapInstance.fitBounds(parentBoundary.getBounds(), { padding: L.point(50, 50) });
    setMap(mapInstance);

    return () => mapInstance.remove();
  }, [layout.latlngs]);
  
  // Effect to handle map clicks
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (tool === 'draw' && isDrawing) {
        setDrawingPoints(prev => [...prev, e.latlng]);
      } else if(tool === 'select') {
        setSelectedPlot(null); // Deselect plot
      }
    };
    map.on('click', handleMapClick);

    return () => { map.off('click', handleMapClick); };
  }, [map, tool, isDrawing]);

  // Effect to render sub-plots
  useEffect(() => {
    if (!plotsLayerGroup.current || !map) return;
    plotsLayerGroup.current.clearLayers();
    
    (layout.plots || []).forEach(plot => {
      const isSelected = plot.id === selectedPlot?.id;
      const plotPolygon = L.polygon(plot.latlngs, {
        color: isSelected ? '#2563eb' : '#1f2937',
        weight: isSelected ? 3 : 1.5,
        fillColor: STATUS_HEX_COLORS[plot.status],
        fillOpacity: 0.65,
      }).addTo(plotsLayerGroup.current!);

      plotPolygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (tool === 'select') {
          setSelectedPlot(plot);
        } else if (tool === 'erase') {
          setLayout(prev => ({
            ...prev,
            plots: prev.plots?.filter(p => p.id !== plot.id) || []
          }));
          setSelectedPlot(null);
        }
      });
      
      // Add hover effect for erase tool
      plotPolygon.on('mouseover', function(this: L.Polygon) {
        if(tool === 'erase') {
            this.setStyle({ fillColor: STATUS_HEX_COLORS.Sold, color: STATUS_HEX_COLORS.Sold });
            setIsHoveringOverErasable(true);
        }
      });
      plotPolygon.on('mouseout', function(this: L.Polygon) {
        if(tool === 'erase') {
            this.setStyle({ fillColor: STATUS_HEX_COLORS[plot.status], color: isSelected ? '#2563eb' : '#1f2937' });
            setIsHoveringOverErasable(false);
        }
      });

      // Add a permanent tooltip with the plot number
      plotPolygon.bindTooltip(plot.plotNumber, {
        permanent: true,
        direction: 'center',
        className: 'layout-label' // Use the same styling
      }).openTooltip();
    });
  }, [layout.plots, selectedPlot, map, tool]);
  
  // Effect for drawing visuals
  useEffect(() => {
    if (!drawingLayerGroup.current) return;
    drawingLayerGroup.current.clearLayers();

    if (isDrawing && drawingPoints.length > 0) {
      drawingPoints.forEach(p => L.circleMarker(p, { radius: 4, color: '#3b82f6', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(drawingLayerGroup.current!));
      if (drawingPoints.length > 1) {
        L.polygon(drawingPoints, { color: '#3b82f6', weight: 3, dashArray: '5, 5' }).addTo(drawingLayerGroup.current!);
      }
    }
  }, [drawingPoints, isDrawing]);

  const handleFinishDrawing = () => {
    if (drawingPoints.length < 3) return;
    const newPlot: Plot = {
      id: generateUUID(),
      plotNumber: `Plot #${(layout.plots?.length || 0) + 1}`,
      status: Status.Available,
      latlngs: drawingPoints,
    };
    setLayout(prev => ({
      ...prev,
      plots: [...(prev.plots || []), newPlot]
    }));
    setDrawingPoints([]);
    setIsDrawing(false);
    setTool('select');
    setSelectedPlot(newPlot);
  };
  
  const handleUpdatePlot = (updatedPlot: Plot) => {
    setLayout(prev => ({
      ...prev,
      plots: prev.plots?.map(p => p.id === updatedPlot.id ? updatedPlot : p) || []
    }));
    setSelectedPlot(updatedPlot);
  };

  const handleSaveAndExit = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    // Simulate network latency for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    onSaveChanges(layout);
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <header className="flex-shrink-0 bg-white dark:bg-slate-800/80 backdrop-blur-md shadow-md z-20 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4">
          <button onClick={onExit} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <BackIcon className="w-6 h-6" />
          </button>
          <div>
            <span className="text-sm text-slate-500">Editor</span>
            <h1 className="text-xl font-bold">{layout.name}</h1>
          </div>
        </div>
        <button
          onClick={handleSaveAndExit}
          disabled={isSaving || !hasChanges}
          className={`
            relative overflow-hidden text-white font-bold py-2 px-6 rounded-lg transition-all w-36 flex justify-center items-center transform
            ${isSaving ? 'cursor-wait bg-blue-600' : ''}
            ${!isSaving && hasChanges ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : ''}
            ${!isSaving && !hasChanges ? 'bg-blue-300 dark:bg-blue-700/60 cursor-not-allowed' : ''}
          `}
        >
          <span className={`${isSaving ? 'opacity-0' : 'opacity-100'}`}>
            {hasChanges ? 'Save & Exit' : 'Up to date'}
          </span>
          {isSaving && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="block absolute w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></span>
              <span className="opacity-75">Saving...</span>
            </span>
          )}
        </button>
      </header>
      <main className="flex-grow flex overflow-hidden">
        {/* Center Map Area */}
        <div
          className={`flex-grow relative ${
            tool === 'draw' ? 'cursor-crosshair' :
            tool === 'select' ? 'cursor-move' :
            (tool === 'erase' && isHoveringOverErasable) ? 'cursor-pointer' :
            'cursor-default'
          }`}
        >
           {/* Floating Toolbar */}
          <div className="absolute top-4 left-4 z-[1000] bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-xl shadow-lg flex flex-col space-y-2">
            <ToolButton icon={<SelectIcon />} label="Select" active={tool === 'select'} onClick={() => handleToolSelect('select')} />
            <ToolButton icon={<PencilIcon />} label="Draw" active={tool === 'draw'} onClick={() => handleToolSelect('draw')} />
            <ToolButton icon={<EraserIcon />} label="Erase" active={tool === 'erase'} onClick={() => handleToolSelect('erase')} />
          </div>

          <div ref={mapRef} className="w-full h-full" />
           {isDrawing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg flex space-x-2">
              <button 
                onClick={handleFinishDrawing}
                disabled={drawingPoints.length < 3}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                Finish Plot
              </button>
               <button 
                onClick={() => { setIsDrawing(false); setDrawingPoints([]); setTool('select'); }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        <div className="w-96 flex-shrink-0 bg-white dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 overflow-y-auto">
          {selectedPlot ? (
            <PlotEditor key={selectedPlot.id} plot={selectedPlot} onUpdate={handleUpdatePlot} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 dark:text-slate-400">
                <InfoIcon className="w-16 h-16 mb-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-lg font-semibold">No Plot Selected</h3>
                <p className="text-sm">Use the 'Select' tool to click on a plot, or draw a new one.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ToolButton: React.FC<{icon: React.ReactNode, label: string, active: boolean, onClick: () => void}> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} title={label} className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors duration-200 ${active ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
    <div className="w-6 h-6">{icon}</div>
    <span className="text-xs mt-1">{label}</span>
  </button>
);

const PlotEditor: React.FC<{plot: Plot, onUpdate: (plot: Plot) => void}> = ({ plot, onUpdate }) => {
  const [formData, setFormData] = useState({ plotNumber: plot.plotNumber, status: plot.status });

  useEffect(() => {
    setFormData({ plotNumber: plot.plotNumber, status: plot.status });
  }, [plot]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, plotNumber: e.target.value }));
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, status: e.target.value as Status }));
  };

  const handleSaveChanges = () => {
    onUpdate({ ...plot, ...formData });
  };
  
  useEffect(() => {
    // Auto-save on change
    const timeoutId = setTimeout(() => {
        if(formData.plotNumber !== plot.plotNumber || formData.status !== plot.status) {
            handleSaveChanges();
        }
    }, 500);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Plot Details</h2>
       <div className="space-y-6">
        <div className="flex items-start space-x-3">
          <TagIcon className="w-6 h-6 mt-1 text-slate-400"/>
          <div>
            <label htmlFor="plotNumber" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Plot Number</label>
            <input
              type="text"
              id="plotNumber"
              value={formData.plotNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <EditIcon className="w-6 h-6 mt-1 text-slate-400"/>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={handleStatusChange}
              className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {Object.values(Status).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LayoutEditor;
import React, { useRef, useEffect, useState } from 'react';
import { Layout, Status } from '../types';
import { MAP_CENTER, MAP_ZOOM, STATUS_HEX_COLORS } from '../constants';
import { PencilIcon } from './icons';

interface MapLayoutProps {
  layouts: Layout[];
  onLayoutSelect: (layout: Layout) => void;
  selectedLayoutId?: number | null;
  onDeselect: () => void;
  onDrawingFinish: (latlngs: L.LatLngExpression[]) => void;
  isAdmin: boolean;
  flyToTrigger: number;
}

const MapLayout: React.FC<MapLayoutProps> = ({ layouts, onLayoutSelect, selectedLayoutId, onDeselect, onDrawingFinish, isAdmin, flyToTrigger }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);

  const layoutsLayerGroup = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroup = useRef<L.LayerGroup | null>(null);

  // Effect for initializing the map and layer groups. Runs once on mount.
  useEffect(() => {
    if (!mapRef.current) return;

    const mapInstance = L.map(mapRef.current, {
        zoomControl: true,
    }).setView(MAP_CENTER, MAP_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);
    
    layoutsLayerGroup.current = L.layerGroup().addTo(mapInstance);
    drawingLayerGroup.current = L.layerGroup().addTo(mapInstance);
    
    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Effect to pan and zoom to the selected layout
  useEffect(() => {
    if (map && selectedLayoutId) {
      const layoutToView = layouts.find(l => l.id === selectedLayoutId);
      if (layoutToView && layoutToView.latlngs.length > 0) {
        const bounds = L.latLngBounds(layoutToView.latlngs);
        // Animate the map view to fit the bounds of the selected layout
        map.fitBounds(bounds, {
          padding: L.point(50, 50),
          maxZoom: MAP_ZOOM
        });
      }
    }
  }, [map, selectedLayoutId, flyToTrigger]); // flyToTrigger ensures this runs on every list click

  // Effect for handling map clicks for deselection or drawing.
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isDrawing) {
        setDrawingPoints(prev => [...prev, e.latlng]);
      } else {
        onDeselect();
      }
    };
    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onDeselect, isDrawing]);
  
  // Render temporary drawing visuals
  useEffect(() => {
    if (!drawingLayerGroup.current) return;
    drawingLayerGroup.current.clearLayers();

    if (isDrawing && drawingPoints.length > 0) {
      drawingPoints.forEach(p => L.circleMarker(p, { radius: 5, color: '#3b82f6', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(drawingLayerGroup.current!));
      if (drawingPoints.length > 1) {
        L.polygon(drawingPoints, { color: '#3b82f6', weight: 3, dashArray: '5, 5' }).addTo(drawingLayerGroup.current!);
      }
    }
  }, [drawingPoints, isDrawing]);

  // Render final layout polygons and their sub-plots
  useEffect(() => {
    if (!layoutsLayerGroup.current) return;
    layoutsLayerGroup.current.clearLayers();

    layouts.forEach(layout => {
      const isSelected = layout.id === selectedLayoutId;

      // Render sub-plots first (if they exist)
      if (layout.plots && layout.plots.length > 0) {
        layout.plots.forEach(plot => {
          L.polygon(plot.latlngs, {
            color: '#4b5563', // A neutral, dark gray border for sub-plots
            weight: 1,
            fillColor: STATUS_HEX_COLORS[plot.status],
            fillOpacity: 0.7,
          }).addTo(layoutsLayerGroup.current!);
        });
      }

      // Then render the main layout boundary on top. It is clickable.
      const mainBoundary = L.polygon(layout.latlngs, {
        color: isSelected ? '#2563eb' : '#1f2937', // Blue when selected, dark gray otherwise
        weight: isSelected ? 4 : 1.5,
        // Fill if there are NO sub-plots. Otherwise, it's just a boundary.
        fillColor: STATUS_HEX_COLORS[layout.status],
        fillOpacity: (layout.plots && layout.plots.length > 0) ? 0.0 : 0.65,
      }).addTo(layoutsLayerGroup.current!);

      mainBoundary.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onLayoutSelect(layout);
      });

      // Add a permanent tooltip with the layout name
      mainBoundary.bindTooltip(layout.name, {
        permanent: true,
        direction: 'center',
        className: 'layout-label' // For custom styling
      }).openTooltip();
    });
  }, [layouts, selectedLayoutId, onLayoutSelect]);

  const handleDrawClick = () => setIsDrawing(true);
  const handleCancelClick = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  }
  const handleFinishClick = () => {
    if (drawingPoints.length > 2) {
      onDrawingFinish(drawingPoints);
    }
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  return (
    <div className={`w-full h-full relative ${isDrawing ? 'cursor-crosshair' : ''}`}>
      <div ref={mapRef} className="w-full h-full" />
      {isAdmin && (
        <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg flex space-x-2">
          {!isDrawing ? (
            <button 
              onClick={handleDrawClick} 
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold"
            >
              <PencilIcon className="w-5 h-5"/> 
              <span>Draw Layout</span>
            </button>
          ) : (
            <>
              <button 
                onClick={handleFinishClick}
                disabled={drawingPoints.length < 3}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                Finish Drawing
              </button>
               <button 
                onClick={handleCancelClick}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-semibold"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MapLayout;
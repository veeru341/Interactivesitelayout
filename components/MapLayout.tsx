import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Layout, ImageOverlay } from '../types';
import { MAP_CENTER, MAP_ZOOM, STATUS_HEX_COLORS } from '../constants';

interface MapLayoutProps {
  layouts: Layout[];
  onLayoutSelect: (layout: Layout) => void;
  selectedLayoutId?: number | null;
  onDeselect: () => void;
  isAdmin: boolean;
  flyToTrigger: number;
  svgOverlays?: ImageOverlay[];
  onUpdateSvgOverlay?: (overlay: ImageOverlay) => void;
  onMapCenterChange?: (center: L.LatLngExpression) => void;
  onFixedOverlayChange?: (overlay: { id: string; imageUrl?: string; svgContent?: string; position: L.LatLngExpression } | null) => void;
}

const MapLayout: React.FC<MapLayoutProps> = ({
  layouts,
  onLayoutSelect,
  selectedLayoutId,
  onDeselect,
  isAdmin,
  flyToTrigger,
  svgOverlays = [],
  onUpdateSvgOverlay,
  onMapCenterChange,
  onFixedOverlayChange,
}: MapLayoutProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  const layoutsLayerGroup = useRef<L.LayerGroup | null>(null);

  // For SVG overlay dragging, resizing, rotating
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateStartAngle, setRotateStartAngle] = useState<number | null>(null); // angle between center and mouse on mousedown
  const [rotateStartMouse, setRotateStartMouse] = useState<{ x: number; y: number } | null>(null);
  const [rotateInitialRotation, setRotateInitialRotation] = useState<number | null>(null); // overlay.rotation on mousedown
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [fixedOverlays, setFixedOverlays] = useState<Set<string>>(new Set());
  // Force update for overlays on map move/zoom
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!map) return;
    const update = () => forceUpdate(v => v + 1);
    map.on('move zoom', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
    };
  }, [map]);

  // Helper to convert map latlng to container point
  const getMapPoint = (latlng: L.LatLngExpression) => {
    if (!map) return { x: 0, y: 0 };
    const pt = map.latLngToLayerPoint(latlng);
    return { x: pt.x, y: pt.y };
  };

  // Mouse event handlers for dragging SVG overlays
  const handleSvgMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
    setDragOffset({ x: e.clientX, y: e.clientY });
  };
  useEffect(() => {
    if (!draggingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId || !map || !onUpdateSvgOverlay) return;
      const overlay = svgOverlays.find(o => o.id === draggingId);
      if (!overlay || !dragOffset) return;
      // Calculate new position
      const mapPoint = map.latLngToLayerPoint(overlay.position);
      const dx = e.clientX - dragOffset.x;
      const dy = e.clientY - dragOffset.y;
      const newPoint = L.point(mapPoint.x + dx, mapPoint.y + dy);
      const newLatLng = map.layerPointToLatLng(newPoint);
      onUpdateSvgOverlay({ ...overlay, position: newLatLng });
      setDragOffset({ x: e.clientX, y: e.clientY });
    };
    const handleMouseUp = () => {
      setDraggingId(null);
      setDragOffset(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragOffset, map, svgOverlays, onUpdateSvgOverlay]);

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
      onDeselect();
    };
    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onDeselect]);

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

  // Resize logic
  useEffect(() => {
    if (!resizingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingId || !map || !onUpdateSvgOverlay) return;
      const overlay = svgOverlays.find(o => o.id === resizingId);
      if (!overlay || !resizeStart) return;
      const pt = map.latLngToLayerPoint(overlay.position);
      const startDist = Math.sqrt(Math.pow(resizeStart.x - pt.x, 2) + Math.pow(resizeStart.y - pt.y, 2));
      const currDist = Math.sqrt(Math.pow(e.clientX - pt.x, 2) + Math.pow(e.clientY - pt.y, 2));
      let newScale = Math.max(0.1, resizeStart.scale * (currDist / startDist));
      onUpdateSvgOverlay({ ...overlay, scale: newScale });
    };
    const handleMouseUp = () => {
      setResizingId(null);
      setResizeStart(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingId, resizeStart, map, svgOverlays, onUpdateSvgOverlay]);
  // Rotate logic
  useEffect(() => {
    if (!rotatingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!rotatingId || !map || !onUpdateSvgOverlay) return;
      const overlay = svgOverlays.find(o => o.id === rotatingId);
      if (!overlay || rotateStartAngle === null || rotateInitialRotation === null) return;
      const pt = map.latLngToLayerPoint(overlay.position);
      const currentAngle = Math.atan2(e.clientY - pt.y, e.clientX - pt.x);
      let delta = currentAngle - rotateStartAngle;
      let newRotation = (rotateInitialRotation + (delta * 180 / Math.PI)) % 360;
      if (newRotation < 0) newRotation += 360;
      onUpdateSvgOverlay({ ...overlay, rotation: newRotation });
    };
    const handleMouseUp = () => {
      setRotatingId(null);
      setRotateStartAngle(null);
      setRotateStartMouse(null);
      setRotateInitialRotation(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rotatingId, rotateStartAngle, rotateInitialRotation, map, svgOverlays, onUpdateSvgOverlay]);
  // Handlers for resize/rotate
  const handleResizeMouseDown = (e: React.MouseEvent, id: string, scale: number, position: L.LatLngExpression) => {
    e.stopPropagation();
    if (!map) return;
    setResizingId(id);
    setResizeStart({ x: e.clientX, y: e.clientY, scale });
  };
  const handleRotateMouseDown = (e: React.MouseEvent, id: string, rotation: number, position: L.LatLngExpression) => {
    e.stopPropagation();
    if (!map) return;
    setRotatingId(id);
    // Calculate initial angle between center and mouse
    const pt = map.latLngToLayerPoint(position);
    const angle = Math.atan2(e.clientY - pt.y, e.clientX - pt.x);
    setRotateStartAngle(angle);
    setRotateStartMouse({ x: e.clientX, y: e.clientY });
    setRotateInitialRotation(rotation);
  };
  // When fixing an overlay, only set it as fixed
  const handleFixOverlay = (id: string) => {
    setFixedOverlays(prev => new Set(prev).add(id));
    const overlay = svgOverlays.find(o => o.id === id);
    if (overlay) {
      const fixedOverlay = {
        id: overlay.id,
        imageUrl: overlay.imageUrl,
        svgContent: overlay.svgContent,
        position: overlay.position
      };
      setCurrentFixedOverlay(fixedOverlay);
      onFixedOverlayChange?.(fixedOverlay);
    }
  };

  useEffect(() => {
    if (!map || !onMapCenterChange) return;
    const update = () => {
      const center = map.getCenter();
      onMapCenterChange({ lat: center.lat, lng: center.lng });
    };
    map.on('move zoom', update);
    // Call once on mount
    update();
    return () => {
      map.off('move', update);
      map.off('zoom', update);
    };
  }, [map, onMapCenterChange]);

  const [currentFixedOverlay, setCurrentFixedOverlay] = useState<{ id: string; imageUrl?: string; svgContent?: string; position: L.LatLngExpression } | null>(null);

  useEffect(() => {
    onFixedOverlayChange?.(currentFixedOverlay);
  }, [currentFixedOverlay, onFixedOverlayChange]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      {/* SVG Overlays */}
      {svgOverlays.map(overlay => {
        const pt = map ? map.latLngToLayerPoint(overlay.position) : { x: 0, y: 0 };
        const isFixed = fixedOverlays.has(overlay.id);
        return (
          <div
            key={overlay.id}
            style={{
              position: 'absolute',
              left: pt.x,
              top: pt.y,
              transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`,
              cursor: isAdmin && !isFixed ? (draggingId === overlay.id ? 'grabbing' : 'grab') : 'default',
              zIndex: 1000,
              pointerEvents: isAdmin && !isFixed ? 'auto' : 'none',
              userSelect: 'none',
            }}
            onMouseDown={isAdmin && !isFixed ? (e) => handleSvgMouseDown(e, overlay.id) : undefined}
          >
            {overlay.svgContent ? (
              <div dangerouslySetInnerHTML={{ __html: overlay.svgContent }} style={{ display: 'block', maxWidth: 300, maxHeight: 300, pointerEvents: 'none' }} />
            ) : overlay.imageUrl ? (
              <img src={overlay.imageUrl} alt="Overlay" style={{ display: 'block', maxWidth: 300, maxHeight: 300, pointerEvents: 'none' }} />
            ) : null}
            {isAdmin && !isFixed && (
              <>
                {/* Resize handle (bottom right) */}
                <div
                  style={{
                    position: 'absolute',
                    right: -24,
                    bottom: -24,
                    width: 40,
                    height: 40,
                    background: 'rgba(59,130,246,0.95)',
                    borderRadius: '50%',
                    cursor: 'nwse-resize',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    border: '2px solid white',
                    transition: 'background 0.2s',
                  }}
                  onMouseDown={e => { e.stopPropagation(); handleResizeMouseDown(e, overlay.id, overlay.scale, overlay.position); }}
                  title="Resize"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.95)')}
                >
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 24 }}>↔</span>
                </div>
                {/* Rotate handle (top right) */}
                <div
                  style={{
                    position: 'absolute',
                    right: -24,
                    top: -48,
                    width: 40,
                    height: 40,
                    background: 'rgba(16,185,129,0.95)',
                    borderRadius: '50%',
                    cursor: 'crosshair',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    border: '2px solid white',
                    transition: 'background 0.2s',
                  }}
                  onMouseDown={e => { e.stopPropagation(); handleRotateMouseDown(e, overlay.id, overlay.rotation, overlay.position); }}
                  title="Rotate"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5,150,105,1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.95)')}
                >
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 24 }}>⟳</span>
                </div>
                {/* Fix button (top left) */}
                <button
                  style={{
                    position: 'absolute',
                    left: -24,
                    top: -48,
                    width: 60,
                    height: 40,
                    background: 'rgba(30,64,175,0.98)',
                    color: 'white',
                    border: '2px solid white',
                    borderRadius: 8,
                    cursor: 'pointer',
                    zIndex: 10,
                    fontSize: 18,
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'background 0.2s',
                  }}
                  onClick={e => { e.stopPropagation(); handleFixOverlay(overlay.id); }}
                  title="Fix overlay"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,64,175,1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,64,175,0.98)')}
                >
                  Fix
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MapLayout;
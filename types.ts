// NOTE: Added to provide type definitions for the Leaflet JS API,
// as it is loaded from a CDN. In a real-world scenario with a
// build system, installing `@types/leaflet` would be the preferred approach.
declare global {
  namespace L {
    function map(id: string | HTMLElement, options?: MapOptions): Map;
    function tileLayer(urlTemplate: string, options?: TileLayerOptions): TileLayer;
    function latLng(lat: number, lng: number): LatLng;
    function latLngBounds(latlngs: LatLngExpression[]): LatLngBounds;
    function latLngBounds(southWest: LatLngExpression, northEast: LatLngExpression): LatLngBounds;
    function point(x: number, y: number): Point;
    function polygon(latlngs: LatLngExpression[] | LatLngExpression[][], options?: PolylineOptions): Polygon;
    function circleMarker(latlng: LatLngExpression, options?: CircleMarkerOptions): CircleMarker;
    function layerGroup(layers?: Layer[], options?: LayerOptions): LayerGroup;

    interface Map {
      setView(center: LatLngExpression, zoom: number): Map;
      remove(): void;
      getPane(name: string | HTMLElement): HTMLElement | undefined;
      latLngToLayerPoint(latlng: LatLngExpression): Point;
      on(type: string, fn: (e: any) => void, context?: any): this;
      off(type: string, fn?: (e: any) => void, context?: any): this;
      getBounds(): LatLngBounds;
      fitBounds(bounds: LatLngBoundsExpression, options?: FitBoundsOptions): Map;
    }
    
    interface MapOptions {
        center?: LatLngExpression;
        zoom?: number;
        layers?: Layer[];
        zoomControl?: boolean;
    }
    
    interface FitBoundsOptions {
      padding?: Point;
      maxZoom?: number;
    }

    interface TileLayerOptions {
        attribution?: string;
    }
    
    interface TileLayer extends Layer {}

    interface PolylineOptions {
      stroke?: boolean;
      color?: string;
      weight?: number;
      opacity?: number;
      lineCap?: string;
      lineJoin?: string;
      dashArray?: string;
      dashOffset?: string;
      fill?: boolean;
      fillColor?: string;
      fillOpacity?: number;
      fillRule?: string;
    }

    interface CircleMarkerOptions extends PolylineOptions {
      radius?: number;
    }

    interface LayerGroup extends Layer {
      addLayer(layer: Layer): this;
      removeLayer(layer: Layer | number): this;
      hasLayer(layer: Layer | number): boolean;
      clearLayers(): this;
      getLayerId(layer: Layer): number;
    }

    interface LayerOptions {}

    interface TooltipOptions {
      pane?: string;
      offset?: Point;
      direction?: 'right' | 'left' | 'top' | 'bottom' | 'center' | 'auto';
      permanent?: boolean;
      sticky?: boolean;
      interactive?: boolean;
      opacity?: number;
      className?: string;
    }
    
    interface Layer {
      addTo(map: Map | LayerGroup): this;
      on(type: string, fn: (e: any) => void, context?: any): this;
      remove(): void;
      bindTooltip(content: string | HTMLElement | ((layer: Layer) => string), options?: TooltipOptions): this;
      openTooltip(latlng?: LatLngExpression): this;
    }

    interface Path extends Layer {
      getBounds(): LatLngBounds;
      setStyle(style: PolylineOptions): this;
    }

    interface Polygon extends Path {}
    interface CircleMarker extends Path {}
    
    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
    }

    class LatLng {
        constructor(lat: number, lng: number);
        lat: number;
        lng: number;
    }
    
    class LatLngBounds {
        constructor(southWest: LatLngExpression, northEast: LatLngExpression);
        getSouthWest(): LatLng;
        getNorthEast(): LatLng;
        getNorthWest(): LatLng;
        getSouthEast(): LatLng;
        getWest(): number;
        getSouth(): number;
        getEast(): number;
        getNorth(): number;
    }

    type LatLngExpression = LatLng | [number, number] | { lat: number, lng: number };
    type LatLngBoundsExpression = LatLngBounds | [[number, number], [number, number]];

    namespace DomUtil {
      function get(id: string | HTMLElement): HTMLElement | null;
      function setPosition(el: HTMLElement, position: Point): void;
      function create(tagName: string, className?: string, container?: HTMLElement): HTMLElement;
    }

    namespace DomEvent {
        function stopPropagation(e: Event): typeof DomEvent;
    }

    interface LeafletEvent {
      type: string;
      target: any;
    }

    interface LeafletMouseEvent extends LeafletEvent {
        latlng: LatLng;
        layerPoint: Point;
        containerPoint: Point;
        originalEvent: MouseEvent;
    }
  }
}

export enum Status {
  Available = 'Available',
  Pending = 'Pending',
  Sold = 'Sold',
}

export enum Role {
  Admin = 'Admin',
  Client = 'Client',
}

export interface Plot {
  id: string;
  plotNumber: string;
  status: Status;
  latlngs: L.LatLngExpression[];
}

export interface Layout {
  id: number;
  name: string;
  vendorName: string;
  status: Status;
  latlngs: L.LatLngExpression[];
  plots?: Plot[];
}

export type ToastType = 'success' | 'error' | 'info';

export interface SvgOverlay {
  id: string;
  svgContent: string; // The raw SVG XML string
  position: L.LatLngExpression; // Center position on the map
  scale: number; // Scale factor for resizing
  rotation: number; // Rotation in degrees
  initialZoom?: number; // The map zoom at which the overlay was fixed
}
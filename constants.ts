import { Layout, Status } from './types';

export const STATUS_COLORS: Record<Status, string> = {
  [Status.Available]: 'fill-green-500',
  [Status.Pending]: 'fill-orange-400',
  [Status.Sold]: 'fill-red-600',
};

// Added for Leaflet polygon styling, which cannot consume Tailwind classes directly.
export const STATUS_HEX_COLORS: Record<Status, string> = {
  [Status.Available]: '#22c55e',
  [Status.Pending]: '#fb923c',
  [Status.Sold]: '#dc2626',
};

export const INITIAL_LAYOUTS: Layout[] = [];

// --- Leaflet Map settings ---
// Center point for the map view
export const MAP_CENTER: L.LatLngExpression = [37.4220, -122.0840]; // Googleplex
// Initial zoom level
export const MAP_ZOOM = 19;
import { useMapEvents } from 'react-leaflet';

export default function MapViewTracker({ onViewChange }: { 
  onViewChange: (info: { 
    center: { lat: number; lng: number }; 
    radius: number;
    zoom: number 
  }) => void 
}) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const center = map.getCenter();
      const bounds = map.getBounds();
      
      const corner = bounds.getNorthEast();
      const radius = center.distanceTo(corner);
      
      onViewChange({
        center: { lat: center.lat, lng: center.lng },
        radius: Math.round(radius),
        zoom: map.getZoom()
      });
    }
  });

  return null;
}
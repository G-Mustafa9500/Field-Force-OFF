import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Vite marker icon issue
import markerIcon2x  from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon    from "leaflet/dist/images/marker-icon.png";
import markerShadow  from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl:     markerShadow,
});

export default function MapPicker({ value, onChange, height = 280, label = "Map pe click karo location set karne ke liye" }) {
  const mapRef       = useRef(null);
  const leafletMap   = useRef(null);
  const markerRef    = useRef(null);

  const KHI = [24.8607, 67.0011]; // Karachi default

  useEffect(() => {
    if (leafletMap.current) return;

    const center = value?.lat ? [value.lat, value.lng] : KHI;
    leafletMap.current = L.map(mapRef.current, { zoomControl: true }).setView(center, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19
    }).addTo(leafletMap.current);

    // If value given, show marker
    if (value?.lat) {
      markerRef.current = L.marker([value.lat, value.lng], { draggable: true }).addTo(leafletMap.current);
      markerRef.current.on("dragend", e => {
        const { lat, lng } = e.target.getLatLng();
        onChange({ lat: Math.round(lat * 100000) / 100000, lng: Math.round(lng * 100000) / 100000 });
      });
    }

    // Click to set marker
    leafletMap.current.on("click", e => {
      const lat = Math.round(e.latlng.lat * 100000) / 100000;
      const lng = Math.round(e.latlng.lng * 100000) / 100000;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(leafletMap.current);
        markerRef.current.on("dragend", ev => {
          const { lat: lt, lng: ln } = ev.target.getLatLng();
          onChange({ lat: Math.round(lt * 100000) / 100000, lng: Math.round(ln * 100000) / 100000 });
        });
      }
      onChange({ lat, lng });
    });

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; markerRef.current = null; }
    };
  }, []); // eslint-disable-line

  // External value update → move marker
  useEffect(() => {
    if (!leafletMap.current || !value?.lat) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    } else {
      markerRef.current = L.marker([value.lat, value.lng], { draggable: true }).addTo(leafletMap.current);
    }
    leafletMap.current.setView([value.lat, value.lng], 15);
  }, [value?.lat, value?.lng]); // eslint-disable-line

  const goMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => onChange({ lat: Math.round(pos.coords.latitude * 100000) / 100000, lng: Math.round(pos.coords.longitude * 100000) / 100000 }),
      () => alert("Location nahi mila"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <button type="button" onClick={goMyLocation} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          📍 Meri Location
        </button>
      </div>
      <div ref={mapRef} style={{ height, borderRadius: 12, border: "1px solid #e5e7eb" }} />
      {value?.lat && (
        <p className="text-xs text-gray-500 text-center bg-gray-50 rounded-lg py-1.5">
          📌 {value.lat}, {value.lng}
          <span className="ml-2 text-gray-400">(drag marker to adjust)</span>
        </p>
      )}
    </div>
  );
}

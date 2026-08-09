import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapWidget.css';

// SVG Marker Creators for Statuses
const createMarkerIcon = (status) => {
  let color = '#f59e0b'; // Submitted: Orange
  if (status === 'Under Review') color = '#eab308'; // Yellow
  if (status === 'Escalated_Level_1') color = '#ef4444'; // Red
  if (status === 'Escalated_Level_2') color = '#7f1d1d'; // Dark Red / Crimson
  if (status === 'Resolved') color = '#10b981'; // Green

  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'custom-leaflet-marker'
  });
};

// Default pin marker for choosing location
const choiceIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6366f1" width="36" height="36" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.6));">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: 'custom-leaflet-marker-choice'
});

// Module scope so the default prop keeps a stable identity across renders
const DEFAULT_CENTER = [22.5726, 88.4330]; // Salt Lake Sector V

export default function MapWidget({
  grievances = [],
  selectable = false,
  onLocationSelect = null,
  selectedPosition = null,
  center = DEFAULT_CENTER
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const markersGroupRef = useRef(null);

  // Callers pass fresh object/array literals every render. Depending on those directly would
  // re-run the effects on every keystroke in the parent form, so compare the coordinates
  // themselves instead of the wrappers holding them.
  const centerLat = center[0];
  const centerLng = center[1];
  const selectedLat = selectedPosition ? selectedPosition.lat : null;
  const selectedLng = selectedPosition ? selectedPosition.lng : null;

  // Latest callback without making it an effect dependency (it is redefined every render)
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  // Initialize the map exactly once for the lifetime of the component
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(DEFAULT_CENTER, 13);

    // Dark basemap. Some networks/extensions block the CARTO CDN, which leaves Leaflet showing
    // an empty grey container - fall back to plain OpenStreetMap tiles if that happens.
    const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    });

    let tileErrors = 0;
    let didFallback = false;
    cartoLayer.on('tileerror', () => {
      tileErrors += 1;
      // A single miss can just be a transient hiccup; repeated ones mean the CDN is unreachable.
      if (didFallback || tileErrors < 3) return;
      didFallback = true;
      console.warn('[MapWidget] CARTO tiles unreachable, falling back to OpenStreetMap.');
      map.removeLayer(cartoLayer);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
    });
    cartoLayer.addTo(map);

    mapRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);

    // The panel this sits in is a flex column, so the container is often resized after Leaflet has
    // already measured it. Without this the tiles get laid out against stale dimensions and the
    // map renders as a blank grey box.
    map.invalidateSize();
    const rafId = requestAnimationFrame(() => map.invalidateSize());

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersGroupRef.current = null;
      selectedMarkerRef.current = null;
    };
  }, []);

  // Attach/detach the pick-a-location handler without tearing the map down
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectable) return;

    const handleClick = (e) => {
      const { lat, lng } = e.latlng;

      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
      }
      selectedMarkerRef.current = L.marker([lat, lng], { icon: choiceIcon }).addTo(map);

      if (onLocationSelectRef.current) {
        onLocationSelectRef.current({ lat, lng });
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [selectable]);

  // Recentre only when the requested coordinates actually change
  useEffect(() => {
    if (!mapRef.current || centerLat == null || centerLng == null) return;
    mapRef.current.setView([centerLat, centerLng], mapRef.current.getZoom());
  }, [centerLat, centerLng]);

  // Handle selectedPosition updates
  useEffect(() => {
    if (!mapRef.current || selectedLat == null || selectedLng == null) return;

    // Remove previous selection marker if any
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
    }

    selectedMarkerRef.current = L.marker(
      [selectedLat, selectedLng],
      { icon: choiceIcon }
    ).addTo(mapRef.current);

    mapRef.current.setView([selectedLat, selectedLng], 15);
  }, [selectedLat, selectedLng]);

  // Handle grievances updates
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear previous markers
    markersGroupRef.current.clearLayers();

    // Add grievance markers
    grievances.forEach((g) => {
      if (g.latitude && g.longitude) {
        const marker = L.marker([g.latitude, g.longitude], {
          icon: createMarkerIcon(g.status)
        });

        const popupContent = `
          <div class="map-popup">
            <h4>${g.title}</h4>
            <p><strong>Category:</strong> ${g.category}</p>
            <p><strong>ID:</strong> ${g.tracking_id}</p>
            <p><strong>Status:</strong> <span class="badge status-${g.status.toLowerCase()}">${g.status}</span></p>
            <a href="/#/grievance/track?id=${g.tracking_id}" class="popup-link">Track Grievance →</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersGroupRef.current.addLayer(marker);
      }
    });
  }, [grievances]);

  return (
    <div className="map-widget-container">
      <div ref={mapContainerRef} className="map-element" />
      {selectable && (
        <div className="map-hint">
          Click anywhere on the map to pinpoint the grievance location
        </div>
      )}
    </div>
  );
}

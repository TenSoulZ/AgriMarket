'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet when compiled via Webpack / Next.js
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface CityMarker {
  name: string;
  coords: [number, number];
  role: string;
}

const TRANSIT_HUBS: CityMarker[] = [
  { name: 'Harare (Main Silos & GMB HQ)', coords: [-17.8252, 31.0335], role: 'Primary Grain Distribution Hub' },
  { name: 'Bulawayo Depot', coords: [-20.1456, 28.5833], role: 'Matabeleland Storage & Milling Hub' },
  { name: 'Gweru Transit Point', coords: [-19.45, 29.8167], role: 'Midlands Route Junction & Cotton Depot' },
  { name: 'Mutare Depot', coords: [-18.97, 32.67], role: 'Eastern Highlands Fruits & Beans Terminal' },
  { name: 'Masvingo Terminal', coords: [-20.0667, 30.8333], role: 'Southern Drought-Resistant Grains Depot' },
];

export default function LeafletMap() {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <MapContainer
        center={[-19.0154, 29.1549]}
        zoom={6.2}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {TRANSIT_HUBS.map((hub) => (
          <Marker key={hub.name} position={hub.coords}>
            <Popup>
              <div style={{ fontSize: '12.5px', color: '#1A3A08' }}>
                <strong style={{ color: '#2C5410' }}>{hub.name}</strong>
                <span className="d-block text-muted mt-1">{hub.role}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

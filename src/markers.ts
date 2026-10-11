import L from 'leaflet';
import type { PinStatus } from './types';

// Function to generate colored SVG pin icon
export const createPinIcon = (status: PinStatus) => {
  const colorMap = {
    urgent: '#ef4444', // Red
    in_progress: '#eab308', // Yellow
    resolved: '#22c55e', // Green
  };

  const color = colorMap[status];

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
      <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="#ffffff" />
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-pin-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

export const createCurrentLocationIcon = () => {
  const svgIcon = `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(59, 130, 246, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
    </div>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'current-location-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

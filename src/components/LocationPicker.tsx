import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, Loader2, MapPin, X } from 'lucide-react';
import { createPinIcon } from '../markers';
import { searchPlaces } from '../geocode';
import type { SearchResult } from '../geocode';




interface LocationPickerProps {
  initialPosition: { lat: number; lng: number };
  currentPosition: { lat: number; lng: number };
  onPositionChange: (pos: { lat: number; lng: number }) => void;
  onSelectPlace?: (placeName: string) => void;
}

// Inner component: handles drag
const DraggableMarker: React.FC<{
  position: { lat: number; lng: number };
  onDragEnd: (pos: { lat: number; lng: number }) => void;
}> = ({ position, onDragEnd }) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onDragEnd({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={createPinIcon('urgent')}
      draggable={true}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  );
};

// Component to fly map to target when position changes from search
const MapViewUpdater: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], 17, { animate: true, duration: 0.8 });
  }, [center.lat, center.lng, map]);
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialPosition,
  currentPosition,
  onPositionChange,
  onSelectPlace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setShowDropdown(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: SearchResult) => {
    const newPos = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
    onPositionChange(newPos);
    if (onSelectPlace) {
      onSelectPlace(result.display_name.split(',').slice(0, 3).join(', ').trim());
    }
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleDragEnd = (pos: { lat: number; lng: number }) => {
    onPositionChange(pos);
  };

  // Map click handler to move marker
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  };

  return (
    <div className="space-y-2">
      {/* Search Input Box */}
      <div className="relative">
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-red-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสถานที่ / ถนน / ซอย เพื่อปักหมุด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
            className="w-full text-xs bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
          />
          {isSearching && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
          {searchQuery && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowDropdown(false);
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[1200] max-h-48 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                type="button"
                key={item.place_id}
                onClick={() => handleSelectResult(item)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-start space-x-2 border-b border-gray-50 last:border-0 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-gray-700 leading-snug line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mini Interactive Map with Draggable Marker */}
      <div className="rounded-xl overflow-hidden border-2 border-red-200 h-44 relative">
        <MapContainer
          center={[initialPosition.lat, initialPosition.lng]}
          zoom={17}
          zoomControl={false}
          className="w-full h-full"
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewUpdater center={currentPosition} />
          <DraggableMarker position={currentPosition} onDragEnd={handleDragEnd} />
          <MapClickHandler />
        </MapContainer>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-full pointer-events-none z-[400] whitespace-nowrap">
          ลากหมุด หรือกดบนแผนที่เพื่อปรับตำแหน่ง
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import {
  Plus,
  Navigation,
  Clock,
  List,
  Shield,
  LogOut,
} from 'lucide-react';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { rtdb } from './firebase';
import type { EmergencyPin, PinStatus } from './types';

import { createPinIcon, createCurrentLocationIcon } from './markers';
import { NewReportModal } from './components/NewReportModal';
import { PinDetailModal } from './components/PinDetailModal';
import { PinListDrawer } from './components/PinListDrawer';
import { LoginModal } from './components/LoginModal';
import { AuthProvider, useAuth } from './auth';

// 12 hours in milliseconds
const EXPIRE_TIME_MS = 12 * 60 * 60 * 1000;

// Component to handle map view centering & fly-to
const MapController: React.FC<{
  flyToTarget: { lat: number; lng: number; zoom: number } | null;
  onFlewTo: () => void;
}> = ({ flyToTarget, onFlewTo }) => {
  const map = useMap();

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, {
        animate: true,
        duration: 1,
      });
      onFlewTo();
    }
  }, [flyToTarget, map, onFlewTo]);

  return null;
};

function MainApp() {
  const { isAdmin, login, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Pins synced from Firebase Realtime Database
  const [pins, setPins] = useState<EmergencyPin[]>([]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 13.7563,
    lng: 100.5018,
  });
  const [hasUserLocation, setHasUserLocation] = useState(false);

  // Fly-to target
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);

  // Modals & drawer state
  const [activePinForDetail, setActivePinForDetail] = useState<EmergencyPin | null>(null);
  const [newPinPosition, setNewPinPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | PinStatus>('all');

  // 1. Sync Pins in REALTIME from Firebase
  useEffect(() => {
    const pinsRef = ref(rtdb, 'emergency_pins');
    const unsubscribe = onValue(pinsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object dictionary to array
        const list: EmergencyPin[] = Object.values(data).map((item: any) => ({
          ...item,
          comments: item.comments ? Object.values(item.comments) : [],
        }));
        // Sort newest first
        list.sort((a, b) => b.createdAt - a.createdAt);
        setPins(list);
      } else {
        setPins([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update activePinForDetail if pins change
  useEffect(() => {
    if (activePinForDetail) {
      const updated = pins.find((p) => p.id === activePinForDetail.id);
      if (updated) {
        setActivePinForDetail(updated);
      } else {
        setActivePinForDetail(null);
      }
    }
  }, [pins]);

  // Request user Geolocation on start & watchPosition for continuous accuracy
  useEffect(() => {
    if ('geolocation' in navigator) {
      let isFirstLocation = true;
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(coords);
          setHasUserLocation(true);
          if (isFirstLocation) {
            setFlyToTarget({ ...coords, zoom: 16 });
            isFirstLocation = false;
          }
        },
        (error) => {
          console.warn('Geolocation denied or failed, using default Bangkok coords.', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  // All non-expired pins (used for counts)
  const allActivePins = useMemo(() => {
    const now = Date.now();
    return pins.filter((p) => now - p.createdAt < EXPIRE_TIME_MS);
  }, [pins]);

  // Count by status
  const countByStatus = useMemo(() => {
    const counts = { urgent: 0, in_progress: 0, resolved: 0 };
    allActivePins.forEach((p) => {
      counts[p.status]++;
    });
    return counts;
  }, [allActivePins]);

  // Filtered pins for map display
  const filteredPins = useMemo(() => {
    if (statusFilter === 'all') return allActivePins;
    return allActivePins.filter((p) => p.status === statusFilter);
  }, [allActivePins, statusFilter]);

  // Handle adding a new emergency pin (write to Firebase)
  const handleCreatePin = async (
    newPinData: Omit<EmergencyPin, 'id' | 'createdAt' | 'status' | 'comments'>
  ) => {
    const pinId = 'pin-' + Date.now();
    
    // Firebase does not allow 'undefined' fields, so clean them up
    const cleanData: any = {
      id: pinId,
      lat: newPinData.lat,
      lng: newPinData.lng,
      title: newPinData.title,
      category: newPinData.category,
      status: 'urgent',
      createdAt: Date.now(),
    };
    if (newPinData.description) cleanData.description = newPinData.description;
    if (newPinData.locationName) cleanData.locationName = newPinData.locationName;
    if (newPinData.contact) cleanData.contact = newPinData.contact;
    if (newPinData.imageUrl) cleanData.imageUrl = newPinData.imageUrl;

    try {
      await set(ref(rtdb, `emergency_pins/${pinId}`), cleanData);
      setNewPinPosition(null);
      setActivePinForDetail(cleanData);
    } catch (err: any) {
      console.error('Failed to create pin:', err);
      alert('ไม่สามารถส่งหมุดได้: ' + (err.message || 'โปรดตรวจสอบ Firebase Rules'));
    }
  };

  // Update status (Admin only - write to Firebase)
  const handleUpdateStatus = useCallback(async (pinId: string, newStatus: PinStatus) => {
    try {
      await update(ref(rtdb, `emergency_pins/${pinId}`), { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }, []);

  // Delete pin (Admin only - remove from Firebase)
  const handleDeletePin = useCallback(async (pinId: string) => {
    try {
      await remove(ref(rtdb, `emergency_pins/${pinId}`));
      setActivePinForDetail(null);
    } catch (err) {
      console.error('Failed to delete pin:', err);
    }
  }, []);

  // Add comment (write to Firebase)
  const handleAddComment = useCallback(async (pinId: string, commentText: string, author: string) => {
    const commentId = 'c-' + Date.now();
    const newComment = {
      id: commentId,
      author,
      text: commentText,
      createdAt: Date.now(),
    };
    try {
      await set(ref(rtdb, `emergency_pins/${pinId}/comments/${commentId}`), newComment);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  }, []);

  // Fly to a specific pin from drawer
  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyToTarget({ lat, lng, zoom: 17 });
    setIsDrawerOpen(false);
  }, []);

  // Recenter to user location
  const handleRecenter = () => {
    setFlyToTarget({ ...userLocation, zoom: 16 });
  };

  return (
    <div className="relative w-full h-full h-[100dvh] overflow-hidden select-none">
      {/* ========== TOP BAR ========== */}
      <div
        className="absolute left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none gap-2"
        style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
      >
        {/* Left Side: Logo + Admin Status */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-gray-100 flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <span className="font-bold text-sm text-gray-900 tracking-tight">SOS Map</span>
          </div>

          {/* Admin Login / Logout button */}
          {isAdmin ? (
            <div className="bg-blue-600 text-white px-3 py-1.5 rounded-2xl shadow-lg flex items-center space-x-1.5 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
              <button
                onClick={logout}
                className="ml-1 p-1 hover:bg-blue-700 rounded-lg transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-white/95 backdrop-blur-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-2xl shadow-lg border border-gray-100 flex items-center space-x-1.5 text-xs font-semibold transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>

        {/* Sticky Counter Widget - Always visible */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-lg border border-gray-100 flex items-center space-x-1 pointer-events-auto text-[11px] font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ทั้งหมด {allActivePins.length}
          </button>
          <button
            onClick={() => setStatusFilter('urgent')}
            className={`px-2 py-1 rounded-lg transition-all ${
              statusFilter === 'urgent'
                ? 'bg-red-500 text-white'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            🔴 {countByStatus.urgent}
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-2 py-1 rounded-lg transition-all ${
              statusFilter === 'in_progress'
                ? 'bg-yellow-500 text-white'
                : 'text-yellow-700 hover:bg-yellow-50'
            }`}
          >
            🟡 {countByStatus.in_progress}
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-2 py-1 rounded-lg transition-all ${
              statusFilter === 'resolved'
                ? 'bg-green-600 text-white'
                : 'text-green-700 hover:bg-green-50'
            }`}
          >
            🟢 {countByStatus.resolved}
          </button>
        </div>
      </div>

      {/* ========== MAP ========== */}
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          flyToTarget={flyToTarget}
          onFlewTo={() => setFlyToTarget(null)}
        />

        {/* Current User Location Marker */}
        {hasUserLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createCurrentLocationIcon()}
          >
            <Popup>คุณอยู่ที่นี่</Popup>
          </Marker>
        )}

        {/* All Emergency Pins from Firebase */}
        {filteredPins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createPinIcon(pin.status)}
            eventHandlers={{
              click: () => setActivePinForDetail(pin),
            }}
          />
        ))}
      </MapContainer>

      {/* ========== BOTTOM FLOATING CONTROLS ========== */}
      <div
        className="absolute left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none"
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))' }}
      >
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="p-3.5 bg-white text-gray-700 rounded-full shadow-xl hover:bg-gray-50 active:scale-95 transition-all pointer-events-auto border border-gray-100"
          title="กลับไปยังพิกัดของฉัน"
        >
          <Navigation className="w-5 h-5 text-blue-600" />
        </button>

        {/* BIG EMERGENCY BUTTON */}
        <button
          onClick={() => setNewPinPosition(userLocation)}
          className="px-6 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm tracking-wide rounded-full shadow-2xl shadow-red-600/40 transition-all flex items-center space-x-2 pointer-events-auto"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>ปักหมุดขอความช่วยเหลือ</span>
        </button>

        {/* Drawer Toggle Button with count badge */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="relative p-3.5 bg-white text-gray-700 rounded-full shadow-xl hover:bg-gray-50 active:scale-95 transition-all pointer-events-auto border border-gray-100"
          title="เปิดรายการเหตุการณ์"
        >
          <List className="w-5 h-5 text-gray-700" />
          {allActivePins.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {allActivePins.length}
            </span>
          )}
        </button>
      </div>

      {/* ========== EXPIRY NOTE ========== */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full pointer-events-none flex items-center space-x-1">
        <Clock className="w-3 h-3 text-yellow-400" />
        <span>หมุดหมดอายุอัตโนมัติใน 12 ชม.</span>
      </div>

      {/* ========== PIN LIST DRAWER ========== */}
      <PinListDrawer
        isOpen={isDrawerOpen}
        isAdmin={isAdmin}
        onClose={() => setIsDrawerOpen(false)}
        pins={allActivePins}
        onFlyTo={handleFlyTo}
        onUpdateStatus={handleUpdateStatus}
        onAddComment={handleAddComment}
        onDeletePin={handleDeletePin}
      />

      {/* ========== MODALS ========== */}
      {newPinPosition && (
        <NewReportModal
          initialPosition={newPinPosition}
          onClose={() => setNewPinPosition(null)}
          onSubmit={handleCreatePin}
        />
      )}

      {activePinForDetail && (
        <PinDetailModal
          pin={activePinForDetail}
          isAdmin={isAdmin}
          onClose={() => setActivePinForDetail(null)}
          onUpdateStatus={handleUpdateStatus}
          onAddComment={handleAddComment}
          onDelete={handleDeletePin}
        />
      )}

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

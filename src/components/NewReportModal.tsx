import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, X, AlertTriangle, Phone, FileText, Loader2 } from 'lucide-react';
import type { EmergencyPin } from '../types';
import { reverseGeocode } from '../geocode';
import { LocationPicker } from './LocationPicker';

interface NewReportModalProps {
  initialPosition: { lat: number; lng: number };
  onClose: () => void;
  onSubmit: (pin: Omit<EmergencyPin, 'id' | 'createdAt' | 'status' | 'comments'>) => void;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  initialPosition,
  onClose,
  onSubmit,
}) => {
  const [category, setCategory] = useState<EmergencyPin['category']>('accident');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [pinPosition, setPinPosition] = useState(initialPosition);

  // Debounce timer for geocode when dragging
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geocode a position
  const doGeocode = (lat: number, lng: number) => {
    setIsLoadingLocation(true);
    reverseGeocode(lat, lng).then((name) => {
      setLocationName(name);
      setIsLoadingLocation(false);
    });
  };

  // Auto reverse geocode on mount
  useEffect(() => {
    doGeocode(initialPosition.lat, initialPosition.lng);
  }, []);

  // When user drags/clicks marker on LocationPicker
  const handlePositionChange = (pos: { lat: number; lng: number }) => {
    setPinPosition(pos);
    // Debounce geocode to avoid spamming API
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      doGeocode(pos.lat, pos.lng);
    }, 500);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      lat: pinPosition.lat,
      lng: pinPosition.lng,
      title: title.trim(),
      category,
      description: description.trim(),
      locationName: locationName.trim() || undefined,
      contact: contact.trim() || undefined,
      imageUrl: imagePreview || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            <h2 className="text-lg font-bold text-gray-900">ปักหมุดขอความช่วยเหลือ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Draggable Location Picker Map */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              📍 ค้นหาสถานที่ หรือลากหมุดเพื่อปรับตำแหน่งให้ตรงจุด
            </label>
            <LocationPicker
              initialPosition={initialPosition}
              currentPosition={pinPosition}
              onPositionChange={handlePositionChange}
              onSelectPlace={(placeName) => setLocationName(placeName)}
            />
          </div>

          {/* Coordinates + Location Name */}
          <div className="bg-red-50 p-3 rounded-xl text-xs text-red-800 space-y-1.5">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-red-600 shrink-0" />
              <span>พิกัด: {pinPosition.lat.toFixed(6)}, {pinPosition.lng.toFixed(6)}</span>
            </div>
            <div className="flex items-start">
              {isLoadingLocation ? (
                <div className="flex items-center text-red-600">
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  <span className="text-[11px]">กำลังค้นหาสถานที่...</span>
                </div>
              ) : (
                <span className="text-[11px] text-red-700 font-medium">📍 {locationName}</span>
              )}
            </div>
          </div>

          {/* Editable location name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
              ชื่อสถานที่ / จุดสังเกต (แก้ไขได้)
            </label>
            <input
              type="text"
              placeholder="เช่น หน้า 7-Eleven ปากซอย 5, แยกอโศก"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              ประเภทเหตุฉุกเฉิน
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'accident', label: '🚗 อุบัติเหตุ' },
                { id: 'robbery', label: '🥷 ปล้น/ชิงทรัพย์' },
                { id: 'fire', label: '🔥 ไฟไหม้/เพลิงไหม้' },
                { id: 'medical', label: '🚑 ป่วยฉุกเฉิน' },
                { id: 'other', label: '⚠️ อื่นๆ' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id as EmergencyPin['category'])}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all ${
                    category === item.id
                      ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload / Capture */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              ถ่ายภาพเหตุการณ์ (ช่วยให้ระบุจุดได้แม่นยำขึ้น)
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 h-40">
                <img
                  src={imagePreview}
                  alt="Incident preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <Camera className="w-8 h-8 text-gray-400 mb-1" />
                <span className="text-xs font-medium text-gray-600">กดเพื่อถ่ายรูป หรืออัปโหลดภาพ</span>
                <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG จากกล้องมือถือ</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              หัวข้อเหตุการณ์ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น รถชนกันบริเวณหน้าปั๊ม / โดนกระชากกระเป๋า"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1 text-gray-400" />
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              rows={2}
              placeholder="เช่น มีผู้บาดเจ็บ 1 ราย, คนร้ายใส่เสื้อดำขี่มอเตอร์ไซค์ไปทาง..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Contact (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
              <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
              เบอร์โทรติดต่อกลับ หรือชื่อผู้แจ้ง (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น 08X-XXX-XXXX หรือ แจ็ค"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>ส่งหมุดขอความช่วยเหลือทันที</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  Trash2,
} from 'lucide-react';
import type { EmergencyPin, PinStatus } from '../types';

interface PinListDrawerProps {
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  pins: EmergencyPin[];
  onFlyTo: (lat: number, lng: number) => void;
  onUpdateStatus: (pinId: string, newStatus: PinStatus) => void;
  onAddComment: (pinId: string, commentText: string, author: string) => void;
  onDeletePin: (pinId: string) => void;
}

const categoryLabel: Record<EmergencyPin['category'], string> = {
  accident: '🚗 อุบัติเหตุ',
  robbery: '🥷 ปล้น/ชิงทรัพย์',
  fire: '🔥 ไฟไหม้',
  medical: '🚑 ป่วยฉุกเฉิน',
  other: '⚠️ อื่นๆ',
};

const statusConfig = {
  urgent: {
    label: '🔴 ฉุกเฉิน',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    cardBorder: 'border-l-red-500',
  },
  in_progress: {
    label: '🟡 กำลังช่วย',
    dotClass: 'bg-yellow-500',
    badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    cardBorder: 'border-l-yellow-500',
  },
  resolved: {
    label: '🟢 ปิดเคส',
    dotClass: 'bg-green-500',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    cardBorder: 'border-l-green-500',
  },
};

const formatTimeAgo = (timestamp: number) => {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return `${diffSec} วินาทีที่แล้ว`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour} ชั่วโมงที่แล้ว`;
};

// Single Pin Card Component
const PinCard: React.FC<{
  pin: EmergencyPin;
  isAdmin: boolean;
  onFlyTo: (lat: number, lng: number) => void;
  onUpdateStatus: (pinId: string, newStatus: PinStatus) => void;
  onAddComment: (pinId: string, commentText: string, author: string) => void;
  onDeletePin: (pinId: string) => void;
}> = ({ pin, isAdmin, onFlyTo, onUpdateStatus, onAddComment, onDeletePin }) => {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(pin.id, commentText.trim(), authorName.trim() || 'พลเมืองดี');
    setCommentText('');
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeletePin(pin.id);
  };

  const config = statusConfig[pin.status];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${config.cardBorder} overflow-hidden`}
    >
      {/* Card Header: clickable summary */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.badgeClass}`}
              >
                {config.label}
              </span>
              <span className="text-[10px] text-gray-400">
                {categoryLabel[pin.category]}
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900 truncate">{pin.title}</h4>
            {pin.locationName && (
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center">
                <MapPin className="w-3 h-3 mr-0.5 text-gray-400 shrink-0" />
                {pin.locationName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-0.5" />
                {formatTimeAgo(pin.createdAt)}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center">
                <MessageSquare className="w-3 h-3 mr-0.5" />
                {pin.comments.length}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-end gap-1 ml-2">
            <button
              onClick={() => onFlyTo(pin.lat, pin.lng)}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="ดูบนแผนที่"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
              title={expanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-gray-50 pt-2.5">
          {/* Image */}
          {pin.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-100 max-h-36">
              <img
                src={pin.imageUrl}
                alt={pin.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          {pin.description && (
            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
              {pin.description}
            </p>
          )}

          {/* Admin actions: Delete button */}
          {isAdmin && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleDelete}
                className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  confirmDelete
                    ? 'bg-red-600 text-white'
                    : 'text-red-500 hover:bg-red-50 border border-red-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? 'ยืนยันลบหมุด?' : 'ลบหมุดนี้'}</span>
              </button>
            </div>
          )}

          {/* Status buttons (Admin only) */}
          {isAdmin ? (
            <div>
              <p className="text-[10px] font-bold text-gray-500 mb-1">🔑 อัปเดตสถานะ (Admin):</p>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold">
                {(['urgent', 'in_progress', 'resolved'] as PinStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(pin.id, s)}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      pin.status === s
                        ? s === 'urgent'
                          ? 'bg-red-500 text-white border-red-500'
                          : s === 'in_progress'
                            ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-green-600 text-white border-green-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {statusConfig[s].label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 py-1.5 px-2 rounded-lg text-[10px] text-gray-400 text-center">
              🔒 เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยนสถานะหรือลบหมุดได้
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-[10px] font-bold text-gray-600 mb-1 flex items-center">
              <MessageSquare className="w-3 h-3 mr-1" />
              คอมเมนต์ ({pin.comments.length})
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {pin.comments.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-2 bg-gray-50 rounded-lg">
                  ยังไม่มีคอมเมนต์
                </p>
              ) : (
                pin.comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px]"
                  >
                    <div className="flex justify-between text-gray-400 mb-0.5">
                      <span className="font-semibold text-gray-700">{c.author}</span>
                      <span className="text-[9px]">{formatTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 break-words">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <form onSubmit={handleCommentSubmit} className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="ชื่อ"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-16 px-2 py-1 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <input
                type="text"
                placeholder="พิมพ์คอมเมนต์..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <button
                type="submit"
                className="p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Drawer Component
export const PinListDrawer: React.FC<PinListDrawerProps> = ({
  isOpen,
  isAdmin,
  onClose,
  pins,
  onFlyTo,
  onUpdateStatus,
  onAddComment,
  onDeletePin,
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[500]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-gray-50 shadow-2xl z-[501] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              📋 รายการเหตุการณ์ทั้งหมด
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              แสดง {pins.length} เหตุการณ์ที่ยังไม่หมดอายุ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pin List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {pins.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">ไม่มีเหตุการณ์ในขณะนี้</p>
              <p className="text-xs mt-1">หมุดจะปรากฏที่นี่เมื่อมีการแจ้งเหตุ</p>
            </div>
          ) : (
            pins.map((pin) => (
              <PinCard
                key={pin.id}
                pin={pin}
                isAdmin={isAdmin}
                onFlyTo={onFlyTo}
                onUpdateStatus={onUpdateStatus}
                onAddComment={onAddComment}
                onDeletePin={onDeletePin}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

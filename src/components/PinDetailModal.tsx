import React, { useState } from 'react';
import { X, Clock, MessageSquare, Send, Phone, Trash2 } from 'lucide-react';
import type { EmergencyPin, PinStatus } from '../types';

interface PinDetailModalProps {
  pin: EmergencyPin;
  isAdmin: boolean;
  onClose: () => void;
  onUpdateStatus: (pinId: string, newStatus: PinStatus) => void;
  onAddComment: (pinId: string, commentText: string, author: string) => void;
  onDelete: (pinId: string) => void;
}

export const PinDetailModal: React.FC<PinDetailModalProps> = ({
  pin,
  isAdmin,
  onClose,
  onUpdateStatus,
  onAddComment,
  onDelete,
}) => {
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusConfig = {
    urgent: {
      label: '🔴 ฉุกเฉิน (รอการช่วยเหลือ)',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
    },
    in_progress: {
      label: '🟡 กำลังมีคนไปช่วย',
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    resolved: {
      label: '🟢 ช่วยเหลือแล้ว / ปิดเคส',
      badgeClass: 'bg-green-100 text-green-800 border-green-300',
    },
  };

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
    onDelete(pin.id);
    onClose();
  };

  // Format time passed
  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return `${diffSec} วินาทีที่แล้ว`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour} ชั่วโมงที่แล้ว`;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                statusConfig[pin.status].badgeClass
              }`}
            >
              {statusConfig[pin.status].label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Admin: Delete button */}
            {isAdmin && (
              <button
                onClick={handleDelete}
                className={`p-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 ${
                  confirmDelete
                    ? 'bg-red-600 text-white px-3'
                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                }`}
                title="ลบหมุดนี้"
              >
                <Trash2 className="w-4 h-4" />
                {confirmDelete && <span>ยืนยันลบ?</span>}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Incident Image */}
          {pin.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 max-h-60 bg-black flex items-center justify-center">
              <img
                src={pin.imageUrl}
                alt={pin.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Title & Info */}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{pin.title}</h1>
            {pin.locationName && (
              <p className="text-xs text-gray-600 mt-0.5 flex items-center">
                <span className="mr-1">📍</span>
                {pin.locationName}
              </p>
            )}
            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatTimeAgo(pin.createdAt)}
              </span>
              <span>• พิกัด: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span>
            </div>
          </div>

          {/* Description */}
          {pin.description && (
            <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-800 leading-relaxed border border-gray-100">
              {pin.description}
            </div>
          )}

          {/* Contact if available */}
          {pin.contact && (
            <div className="flex items-center space-x-2 text-xs font-medium text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
              <Phone className="w-4 h-4 shrink-0" />
              <span>ติดต่อผู้แจ้ง: {pin.contact}</span>
            </div>
          )}

          {/* Status update buttons - Admin only */}
          {isAdmin && (
            <div className="border-t border-b border-gray-100 py-3">
              <span className="block text-xs font-semibold text-gray-500 mb-2">
                🔑 อัปเดตสถานะ (Admin):
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                <button
                  onClick={() => onUpdateStatus(pin.id, 'urgent')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    pin.status === 'urgent'
                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🔴 ฉุกเฉิน
                </button>
                <button
                  onClick={() => onUpdateStatus(pin.id, 'in_progress')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    pin.status === 'in_progress'
                      ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🟡 กำลังช่วย
                </button>
                <button
                  onClick={() => onUpdateStatus(pin.id, 'resolved')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    pin.status === 'resolved'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🟢 ช่วยแล้ว
                </button>
              </div>
            </div>
          )}

          {/* Not admin notice */}
          {!isAdmin && (
            <div className="bg-gray-50 p-2.5 rounded-xl text-[11px] text-gray-500 text-center border border-gray-100">
              🔒 เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยนสถานะหรือลบหมุดได้
            </div>
          )}

          {/* Comments section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-800 flex items-center">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                คอมเมนต์ & ช่วยเหลือ ({(pin.comments || []).length})
              </h3>
            </div>

            {/* Comment list */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {(pin.comments || []).length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">
                  ยังไม่มีคอมเมนต์ ร่วมพิมพ์แจ้งข้อมูลหรือให้กำลังใจได้เลย
                </p>
              ) : (
                (pin.comments || []).map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs">
                    <div className="flex justify-between items-center text-gray-500 mb-1">
                      <span className="font-semibold text-gray-800">{comment.author}</span>
                      <span className="text-[10px]">{formatTimeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 break-words">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment input form - everyone can comment */}
            <form onSubmit={handleCommentSubmit} className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ชื่อของคุณ"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-1/3 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="พิมพ์คอมเมนต์ / แจ้งว่ากำลังไปช่วย..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

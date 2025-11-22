import React, { useState, useRef } from 'react';
import { Star, Trash2, Edit3, Check, X } from 'lucide-react';

interface HistoryItemProps {
  item: {
    id: string;
    message: string;
    stars: number;
    timestamp: Date;
  };
  onDelete: (id: string) => void;
  onEdit: (id: string, newMessage: string) => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState(item.message);
  
  // Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return; // Disable swipe while editing
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null || isEditing) return;
    
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartRef.current;
    
    // RTL Logic:
    // Swipe Left (finger moves Right to Left): diff < 0. 
    // We want to move item to Left (negative translateX) to reveal content on Right.
    
    if (diff < 0) {
      // Swiping left
      setSwipeOffset(Math.max(diff, -100));
    } else {
      // Swiping right (closing)
      setSwipeOffset(Math.min(0, diff));
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null) return;
    
    if (swipeOffset < -40) {
      setSwipeOffset(-80); // Snap open
    } else {
      setSwipeOffset(0); // Snap close
    }
    touchStartRef.current = null;
  };

  const handleSave = () => {
    onEdit(item.id, editMessage);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditMessage(item.message);
    setIsEditing(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-3">
      {/* Background Actions Layer (Revealed on Swipe) */}
      <div className="absolute inset-0 bg-red-50 flex items-center justify-end px-4 rounded-xl">
         <button 
           onClick={() => onDelete(item.id)}
           className="bg-red-500 text-white p-2 rounded-full shadow-sm hover:bg-red-600 transition-colors"
         >
           <Trash2 size={18} />
         </button>
      </div>

      {/* Foreground Content Layer */}
      <div 
        className="relative bg-white/60 backdrop-blur-md border-b border-pink-100/50 p-3 flex items-center gap-3 transition-transform duration-200 ease-out z-10"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-yellow-100 p-2 rounded-full shadow-inner shrink-0">
          <Star size={16} className="text-yellow-600 fill-yellow-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
               <input 
                 type="text" 
                 value={editMessage}
                 onChange={(e) => setEditMessage(e.target.value)}
                 className="w-full text-sm border border-pink-300 rounded px-2 py-1 focus:outline-none focus:border-pink-500"
                 autoFocus
               />
               <button onClick={handleSave} className="text-green-600 p-1 hover:bg-green-50 rounded"><Check size={16}/></button>
               <button onClick={handleCancel} className="text-red-600 p-1 hover:bg-red-50 rounded"><X size={16}/></button>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-800 truncate max-w-[160px]">{item.message}</p>
                <p className="text-[10px] text-gray-500">
                  {item.timestamp.toLocaleDateString('ar-SA')} • {item.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-gray-300 hover:text-pink-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>
        
        <span className="font-black text-pink-600 text-lg">+{item.stars}</span>
      </div>
    </div>
  );
};
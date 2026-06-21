import { useState, useRef } from 'react';
import { formatTime, formatDuration, formatFileSize } from '../utils/formatters.js';
import { MESSAGE_STATUS } from '../utils/constants.js';

const REACTIONS = ['❤️','😂','😮','😢','👍','👎'];

function StatusIcon({ status }) {
  if (status === MESSAGE_STATUS.READ) return <span style={{ color: '#00F5FF' }}>✓✓</span>;
  return <span style={{ color: '#8B8B9E' }}>✓</span>;
}

export default function ChatBubble({ message, isMine, senderName, onReply, onDelete, onReaction }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimer = useRef(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowMenu(true), 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleDoubleTap = (() => {
    let lastTap = 0;
    return () => {
      const now = Date.now();
      if (now - lastTap < 300) setShowReactions(true);
      lastTap = now;
    };
  })();

  const isDeleted = message.deleted;
  const hasMedia = ['image','voice','video'].includes(message.content_type);

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 px-3 animate-fade-in`}>
      {!isMine && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 mt-auto mb-1 overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6B9D, #00F5FF)' }}>
          {message.avatarUrl
            ? <img src={message.avatarUrl} className="w-full h-full object-cover" alt="" />
            : <span className="flex items-center justify-center h-full text-xs font-bold">{senderName?.[0] || '?'}</span>
          }
        </div>
      )}

      <div className="max-w-[75%]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={handleDoubleTap}>
        {!isMine && <p className="text-xs font-semibold mb-0.5 ml-1" style={{ color: '#FF6B9D' }}>{senderName}</p>}

        {/* Reply preview */}
        {message.replyTo && (
          <div className="mb-1 px-2 py-1 rounded-lg border-l-2 ml-1" style={{ borderColor: '#FF6B9D', background: 'rgba(255,107,157,0.1)' }}>
            <p className="text-xs" style={{ color: '#8B8B9E' }}>{message.replyToPreview || 'Pesan'}</p>
          </div>
        )}

        <div className="rounded-2xl px-3 py-2" style={isMine
          ? { background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)', borderBottomRightRadius: 4 }
          : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: 4 }
        }>
          {isDeleted ? (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.4)' }}>🗑️ Pesan telah dihapus</p>
          ) : (
            <>
              {message.content_type === 'image' && (
                <div className="mb-1 rounded-xl overflow-hidden">
                  <img src={message.content} alt={message.caption || ''} className="max-w-full rounded-xl" style={{ maxHeight: 240 }} loading="lazy" />
                  {message.caption && <p className="text-sm mt-1">{message.caption}</p>}
                </div>
              )}
              {message.content_type === 'voice' && (
                <div className="flex items-center gap-2 py-1">
                  <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>▶️</button>
                  <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <span className="text-xs">{formatDuration(message.duration)}</span>
                </div>
              )}
              {message.content_type === 'video' && (
                <div className="mb-1">
                  <video src={message.content} controls className="rounded-xl max-w-full" style={{ maxHeight: 240 }} />
                  {message.caption && <p className="text-sm mt-1">{message.caption}</p>}
                </div>
              )}
              {message.content_type === 'text' && (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
            </>
          )}

          {/* Reaction + time */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {message.reaction && <span className="text-xs">{message.reaction}</span>}
            <span className="text-xs" style={{ color: isMine ? 'rgba(255,255,255,0.65)' : '#8B8B9E' }}>
              {formatTime(message.created_at)}
            </span>
            {isMine && <StatusIcon status={message.status} />}
          </div>
        </div>

        {/* File size */}
        {hasMedia && message.file_size && (
          <p className="text-xs mt-0.5 mx-1" style={{ color: '#8B8B9E' }}>{formatFileSize(message.file_size)}</p>
        )}
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowMenu(false)}>
          <div className="glass-dark rounded-2xl p-2 w-48 animate-bounce-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => { onReply?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm hover:bg-white/10">↩️ Balas</button>
            <button onClick={() => { navigator.clipboard?.writeText(message.content); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm hover:bg-white/10">📋 Salin</button>
            {isMine && <button onClick={() => { onDelete?.(message.id, 'all'); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm" style={{ color: '#FF4757' }}>🗑️ Hapus untuk semua</button>}
            <button onClick={() => { onDelete?.(message.id, 'me'); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm hover:bg-white/10">🗑️ Hapus untukku</button>
          </div>
        </div>
      )}

      {/* Reaction picker */}
      {showReactions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowReactions(false)}>
          <div className="glass-dark rounded-2xl px-4 py-3 flex gap-2 animate-bounce-in" onClick={e => e.stopPropagation()}>
            {REACTIONS.map(r => (
              <button key={r} onClick={() => { onReaction?.(message.id, r); setShowReactions(false); }} className="text-2xl hover:scale-125 transition-transform">{r}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

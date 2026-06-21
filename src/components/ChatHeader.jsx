import { useState } from 'react';

export default function ChatHeader({ title, subtitle, onlineCount, onBack, onSettings, avatarUrl }) {
  return (
    <div className="glass-dark flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {onBack && (
        <button onClick={onBack} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 flex-shrink-0">
          ←
        </button>
      )}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6B9D, #00F5FF)' }}>
          {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-sm font-bold">{title?.[0] || '?'}</span>}
        </div>
        {onlineCount > 0 && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg animate-pulse-dot" style={{ background: '#00F5A0', borderColor: '#0A0A0F' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-sm truncate">{title}</h2>
        <p className="text-xs truncate" style={{ color: '#8B8B9E' }}>{subtitle}{onlineCount > 0 ? ` • ${onlineCount} online` : ''}</p>
      </div>
      {onSettings && (
        <button onClick={onSettings} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 flex-shrink-0 text-lg">
          ⋮
        </button>
      )}
    </div>
  );
}

export default function TypingIndicator({ typers = [] }) {
  if (!typers.length) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1 animate-fade-in">
      <div className="flex gap-1 items-center px-3 py-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)', borderBottomLeftRadius: 4 }}>
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#8B8B9E', animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: '#8B8B9E' }}>
        {typers.length === 1 ? `${typers[0]} sedang mengetik...` : `${typers.length} orang mengetik...`}
      </p>
    </div>
  );
}

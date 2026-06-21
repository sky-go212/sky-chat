import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/constants.js';

export default function EntryPage() {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const extractSlug = (input) => {
    const trimmed = input.trim();
    // Jika user paste URL penuh, ambil slug-nya
    const match = trimmed.match(/\/s\/([a-z0-9]{4}-[a-z0-9]{4})/i);
    if (match) return match[1].toLowerCase();
    // Jika user ketik slug langsung
    if (/^[a-z0-9]{4}-[a-z0-9]{4}$/i.test(trimmed)) return trimmed.toLowerCase();
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const slug = extractSlug(link);
    if (!slug) {
      setError('Link tidak valid. Contoh: sky-chat-ccd.pages.dev/s/abcd-1234');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/s/${slug}`);
      const data = await res.json();
      if (!data.success) {
        setError('SubServer tidak ditemukan. Pastikan link sudah benar.');
      } else {
        navigate(`/s/${slug}`);
      }
    } catch {
      setError('Koneksi gagal. Coba lagi.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #FF6B9D, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #00F5FF, transparent)' }} />
      </div>

      <div className="w-full max-w-sm mx-4 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 glow-pink" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-3xl font-extrabold gradient-text mb-1">SubServer Chat</h1>
          <p className="text-sm" style={{ color: '#8B8B9E' }}>Masukkan link SubServer kamu</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#8B8B9E' }}>
              Link SubServer
            </label>
            <input
              type="text"
              value={link}
              onChange={e => { setLink(e.target.value); setError(''); }}
              placeholder="...pages.dev/s/abcd-1234"
              autoComplete="off"
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl text-sm transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: error ? '1px solid #FF4757' : '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)' }}>
              <span>⚠️</span>
              <p className="text-sm" style={{ color: '#FF4757' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !link.trim()}
            className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-95 glow-pink disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)', color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memeriksa...
              </span>
            ) : 'Masuk ke SubServer →'}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: '#8B8B9E' }}>
          Tidak punya link? Minta kepada admin SubServer kamu.
        </p>
        <p className="text-center text-xs mt-1" style={{ color: '#8B8B9E' }}>
          Tidak ada nomor telepon • Tidak ada email • Zero tracking
        </p>
      </div>
    </div>
  );
}

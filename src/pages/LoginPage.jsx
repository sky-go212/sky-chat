import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCode } from '../utils/formatters.js';

export default function LoginPage() {
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login(code.trim());
    } catch (err) {
      setError(err.message);
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #FF6B9D, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #00F5FF, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #FF6B9D, #00F5FF)' }} />
      </div>

      <div className="w-full max-w-sm mx-4 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 glow-pink" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-3xl font-extrabold gradient-text mb-1">SubServer Chat</h1>
          <p className="text-sm" style={{ color: '#8B8B9E' }}>No cap, 100% private ✨</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#8B8B9E' }}>
              Kode Akses
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={e => setCode(formatCode(e.target.value))}
              placeholder="UTAMA-XXXX-001"
              maxLength={16}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl text-center font-mono text-lg font-medium tracking-widest transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: error ? '1px solid #FF4757' : '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                letterSpacing: '0.15em'
              }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg animate-bounce-in" style={{ background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)' }}>
              <span>⚠️</span>
              <p className="text-sm" style={{ color: '#FF4757' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-95 glow-pink disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)', color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memverifikasi...
              </span>
            ) : 'Join the Vibe 🚀'}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: '#8B8B9E' }}>
          Tidak ada nomor telepon • Tidak ada email • Zero tracking
        </p>
      </div>
    </div>
  );
}

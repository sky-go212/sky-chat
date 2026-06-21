import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE } from '../utils/constants.js';
import { formatTime } from '../utils/formatters.js';

function api(path, opts = {}) {
  const token = localStorage.getItem('ssc_admin');
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }
  }).then(r => r.json());
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: color + '22' }}>{icon}</div>
      <div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs" style={{ color: '#8B8B9E' }}>{label}</p>
      </div>
    </div>
  );
}

function CreateSubServerModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [maxContacts, setMaxContacts] = useState(50);
  const [expiryDays, setExpiryDays] = useState(365);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/subserver', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), maxContacts, expiryDays })
      });
      if (data.success) {
        setResult(data.subServer);
        onCreated?.();
      } else {
        setError(data.error || 'Gagal membuat SubServer');
      }
    } catch {
      setError('Koneksi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-dark rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Buat SubServer Baru</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">✕</button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.3)' }}>
              <p className="text-2xl mb-1">✅</p>
              <p className="font-bold" style={{ color: '#00F5A0' }}>SubServer Berhasil Dibuat!</p>
            </div>
            <div className="space-y-2">
              <div className="glass rounded-xl p-3">
                <p className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Nama SubServer</p>
                <p className="font-semibold">{result.name}</p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#8B8B9E' }}>
                  🔗 Link Unik SubServer
                </p>
                <p className="font-mono text-xs break-all" style={{ color: '#00F5FF' }}>
                  {window.location.origin}/s/{result.slug}
                </p>
                <p className="text-xs mt-1" style={{ color: '#8B8B9E' }}>Bagikan link ini ke semua anggota</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/s/${result.slug}`)}
                  className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold glass"
                >
                  📋 Salin Link
                </button>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Kode User Utama (pemilik SubServer)</p>
                <p className="font-mono font-bold text-lg tracking-widest" style={{ color: '#FF6B9D' }}>{result.ownerCode}</p>
                <p className="text-xs mt-1" style={{ color: '#8B8B9E' }}>Kirim kode ini + link di atas ke pemilik SubServer</p>
              </div>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl font-bold" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>Selesai</button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8B8B9E' }}>Nama SubServer</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Tim Marketing" className="w-full px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8B8B9E' }}>Max Kontak</label>
                <input type="number" value={maxContacts} onChange={e => setMaxContacts(+e.target.value)} min={1} max={500} className="w-full px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8B8B9E' }}>Masa Aktif (hari)</label>
                <input type="number" value={expiryDays} onChange={e => setExpiryDays(+e.target.value)} min={1} max={3650} className="w-full px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: '#FF4757' }}>{error}</p>}
            <button type="submit" disabled={loading || !name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
              {loading ? 'Membuat...' : 'Buat SubServer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [subServers, setSubServers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ssRes, stRes] = await Promise.all([
        api('/api/admin/subserver'),
        api('/api/admin/stats')
      ]);
      if (ssRes.success) setSubServers(ssRes.subServers || []);
      if (stRes.success) setStats(stRes.stats);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (kode, current) => {
    await api(`/api/admin/subserver/${kode}/status`, {
      method: 'PUT',
      body: JSON.stringify({ active: !current })
    });
    load();
  };

  const filtered = subServers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="glass-dark border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <h1 className="font-bold text-sm">Admin Dashboard</h1>
            <p className="text-xs" style={{ color: '#8B8B9E' }}>Pusat Server</p>
          </div>
        </div>
        <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,71,87,0.15)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.3)' }}>
          Keluar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total SubServer" value={stats.totalSubServers || 0} icon="🏠" color="#FF6B9D" />
            <StatCard label="Aktif" value={stats.activeSubServers || 0} icon="✅" color="#00F5A0" />
            <StatCard label="Total Kontak" value={stats.totalContacts || 0} icon="👥" color="#00F5FF" />
            <StatCard label="Nonaktif" value={stats.inactiveSubServers || 0} icon="⏸️" color="#FFD700" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari SubServer..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap glow-pink" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
            + Buat Baru
          </button>
        </div>

        {/* SubServer List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏠</p>
            <p className="font-semibold">Belum ada SubServer</p>
            <p className="text-sm mt-1" style={{ color: '#8B8B9E' }}>Buat SubServer pertama untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ss => (
              <div key={ss.ownerCode} className="glass rounded-xl p-4 animate-fade-in">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{ss.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                        background: ss.active ? 'rgba(0,245,160,0.15)' : 'rgba(255,71,87,0.15)',
                        color: ss.active ? '#00F5A0' : '#FF4757'
                      }}>
                        {ss.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="font-mono text-sm mt-0.5" style={{ color: '#FF6B9D' }}>{ss.ownerCode}</p>
                  </div>
                  <button
                    onClick={() => toggleStatus(ss.ownerCode, ss.active)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: ss.active ? 'rgba(255,71,87,0.15)' : 'rgba(0,245,160,0.15)',
                      color: ss.active ? '#FF4757' : '#00F5A0',
                      border: `1px solid ${ss.active ? 'rgba(255,71,87,0.3)' : 'rgba(0,245,160,0.3)'}`
                    }}
                  >
                    {ss.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
                {ss.slug && (
                  <div className="mb-2 flex items-center gap-2">
                    <p className="font-mono text-xs truncate flex-1" style={{ color: '#00F5FF' }}>
                      /s/{ss.slug}
                    </p>
                    <button
                      onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/s/${ss.slug}`)}
                      className="text-xs px-2 py-0.5 rounded glass flex-shrink-0"
                      style={{ color: '#00F5FF' }}
                    >
                      📋
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs" style={{ color: '#8B8B9E' }}>
                  <span>👥 {ss.contactCount || 0}/{ss.maxContacts} kontak</span>
                  <span>•</span>
                  <span>📅 {ss.expiresAt ? formatTime(ss.expiresAt) : 'Tidak ada batas'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateSubServerModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

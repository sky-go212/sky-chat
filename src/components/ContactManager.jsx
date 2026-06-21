import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/constants.js';
import { formatTime } from '../utils/formatters.js';

function api(path, opts = {}) {
  const token = localStorage.getItem('ssc_token');
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }
  }).then(r => r.json());
}

function ContactCard({ contact, onReset, onDelete, onCopy }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(contact.contact_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(contact.contact_code);
  };

  return (
    <div className="glass rounded-xl p-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B9D, #00F5FF)' }}>
          {contact.avatar_url
            ? <img src={contact.avatar_url} className="w-full h-full object-cover" alt="" />
            : <span className="flex items-center justify-center h-full font-bold">{contact.name?.[0] || '?'}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{contact.name}</p>
          <p className="font-mono text-sm" style={{ color: '#00F5FF' }}>{contact.contact_code}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: contact.is_active ? 'rgba(0,245,160,0.15)' : 'rgba(255,71,87,0.15)', color: contact.is_active ? '#00F5A0' : '#FF4757' }}>
          {contact.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: '#8B8B9E' }}>Ditambah {formatTime(contact.created_at)}</p>
      <div className="flex gap-2">
        <button onClick={copy} className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all" style={{ background: copied ? 'rgba(0,245,160,0.2)' : 'rgba(255,255,255,0.07)', color: copied ? '#00F5A0' : '#fff' }}>
          {copied ? '✓ Disalin' : '📋 Salin Kode'}
        </button>
        <button onClick={() => onReset?.(contact.contact_code)} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
          🔄 Reset
        </button>
        <button onClick={() => onDelete?.(contact.contact_code)} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,71,87,0.15)', color: '#FF4757' }}>
          🗑️
        </button>
      </div>
    </div>
  );
}

function AddContactModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const data = await api('/api/subserver/contacts', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      if (data.success) { setResult(data.contact); onAdded?.(); }
      else setError(data.error || 'Gagal menambah kontak');
    } catch { setError('Koneksi gagal'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-dark rounded-t-2xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Tambah Kontak</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">✕</button>
        </div>
        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.3)' }}>
              <p className="font-bold mb-1" style={{ color: '#00F5A0' }}>✅ Kontak ditambahkan!</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Kode untuk {result.name}</p>
              <p className="font-mono font-bold text-2xl tracking-widest" style={{ color: '#FF6B9D' }}>{result.contact_code}</p>
              <p className="text-xs mt-2" style={{ color: '#8B8B9E' }}>Kirim kode ini ke kontak Anda</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(result.contact_code); }} className="py-2.5 rounded-xl text-sm font-semibold glass">📋 Salin</button>
              <button onClick={onClose} className="py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>Selesai</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8B8B9E' }}>Nama Kontak</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap..." autoFocus className="w-full px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            {error && <p className="text-sm" style={{ color: '#FF4757' }}>{error}</p>}
            <button type="submit" disabled={loading || !name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
              {loading ? 'Menambahkan...' : 'Tambah Kontak'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ContactManager({ onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/subserver/contacts');
      if (data.success) setContacts(data.contacts || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = async (code) => {
    if (!confirm('Reset kode kontak ini? Kontak harus login ulang.')) return;
    await api(`/api/subserver/contacts/${code}/reset`, { method: 'POST' });
    load();
  };

  const handleDelete = async (code) => {
    if (!confirm('Hapus kontak ini?')) return;
    await api(`/api/subserver/contacts/${code}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: '#0A0A0F' }}>
      <div className="glass-dark flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10">←</button>
        <h1 className="font-bold flex-1">Kelola Kontak</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl text-sm font-semibold glow-pink" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>+ Tambah</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-xl shimmer" />)}</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold">Belum ada kontak</p>
            <p className="text-sm mt-1" style={{ color: '#8B8B9E' }}>Tambah kontak pertama Anda</p>
          </div>
        ) : contacts.map(c => (
          <ContactCard key={c.contact_code} contact={c} onReset={handleReset} onDelete={handleDelete} />
        ))}
      </div>
      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}

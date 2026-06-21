import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import GroupChat from './GroupChat.jsx';
import PersonalChat from './PersonalChat.jsx';
import TabSwitcher from '../components/TabSwitcher.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import { API_BASE } from '../utils/constants.js';
import { formatTime } from '../utils/formatters.js';

function api(path, opts = {}) {
  const token = localStorage.getItem('ssc_token');
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }
  }).then(r => r.json());
}

export default function ChatRoom() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('group');
  const [subServerInfo, setSubServerInfo] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [onlineMap, setOnlineMap] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const { on } = useWebSocket(user?.subServerId);

  const isUtama = user?.role === 'utama';

  const loadInfo = useCallback(async () => {
    try {
      const [infoRes, contRes] = await Promise.all([
        api('/api/subserver/info'),
        api('/api/subserver/contacts')
      ]);
      if (infoRes.success) setSubServerInfo(infoRes.subServer);
      if (contRes.success) setContacts(contRes.contacts || []);
    } catch {}
  }, []);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  useEffect(() => {
    const off = on('presence', (data) => {
      setOnlineMap(prev => ({ ...prev, [data.contactCode]: data.isOnline }));
    });
    return off;
  }, [on]);

  const onlineCount = Object.values(onlineMap).filter(Boolean).length;

  const tabs = isUtama
    ? [
        { id: 'group', label: '👥 Grup' },
        { id: 'personal', label: '💬 Pribadi' },
        { id: 'contacts', label: '➕ Kontak' },
      ]
    : [
        { id: 'group', label: '👥 Ruang Umum' },
        { id: 'personal', label: '💬 Chat Pribadi' },
      ];

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <ChatHeader
        title={subServerInfo?.name || 'SubServer Chat'}
        subtitle={`${contacts.length} kontak`}
        onlineCount={onlineCount}
        onSettings={() => setShowMenu(!showMenu)}
      />

      {showMenu && (
        <div className="absolute top-14 right-3 z-50 glass-dark rounded-xl py-1 w-44 animate-fade-in" onClick={() => setShowMenu(false)}>
          <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10">⚙️ Pengaturan</button>
          <div className="h-px mx-3 my-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm" style={{ color: '#FF4757' }}>🚪 Keluar</button>
        </div>
      )}
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}

      <TabSwitcher tabs={tabs} active={tab} onChange={setTab} />

      <div className="flex-1 overflow-hidden">
        {tab === 'group' && (
          <GroupChat
            subServerId={user?.subServerId}
            subServerName={subServerInfo?.name}
            onlineContacts={contacts.filter(c => onlineMap[c.contact_code])}
          />
        )}
        {tab === 'personal' && (
          <PersonalChat
            subServerId={user?.subServerId}
            contacts={contacts}
            myCode={user?.contactCode}
            onlineMap={onlineMap}
          />
        )}
        {tab === 'contacts' && isUtama && (
          <ContactPanel onContactsChange={loadInfo} />
        )}
      </div>
    </div>
  );
}

/* ─── Panel Kontak (tab inline, khusus UTAMA) ─── */

function ContactPanel({ onContactsChange }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState(null);
  const [addError, setAddError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/subserver/contacts');
      if (data.success) setContacts(data.contacts || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      const data = await api('/api/subserver/contacts', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      });
      if (data.success) {
        setNewContact(data.contact);
        setName('');
        load();
        onContactsChange?.();
      } else {
        setAddError(data.error || 'Gagal menambah kontak');
      }
    } catch {
      setAddError('Koneksi gagal');
    }
    setAdding(false);
  };

  const handleReset = async (code) => {
    if (!confirm('Reset kode kontak ini? Kontak harus login ulang dengan kode baru.')) return;
    await api(`/api/subserver/contacts/${code}/reset`, { method: 'POST' });
    load();
    onContactsChange?.();
  };

  const handleDelete = async (code) => {
    if (!confirm('Hapus kontak ini secara permanen?')) return;
    await api(`/api/subserver/contacts/${code}`, { method: 'DELETE' });
    load();
    onContactsChange?.();
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header panel */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <p className="font-semibold text-sm">Kelola Kontak</p>
          <p className="text-xs" style={{ color: '#8B8B9E' }}>{contacts.length} kontak terdaftar</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setNewContact(null); setAddError(''); setName(''); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: showForm ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#FF6B9D,#FF8E53)' }}
        >
          {showForm ? '✕ Tutup' : '+ Tambah Kontak'}
        </button>
      </div>

      {/* Form tambah kontak */}
      {showForm && (
        <div className="flex-shrink-0 px-4 py-4 animate-fade-in" style={{ background: 'rgba(255,107,157,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {newContact ? (
            /* Tampilkan kode baru setelah berhasil */
            <div className="space-y-3">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,245,160,0.08)', border: '1px solid rgba(0,245,160,0.25)' }}>
                <p className="text-sm font-semibold" style={{ color: '#00F5A0' }}>✅ Kontak berhasil ditambahkan!</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-xs mb-2" style={{ color: '#8B8B9E' }}>Kode login untuk <strong>{newContact.name}</strong></p>
                <p className="font-mono font-bold text-3xl tracking-widest mb-1" style={{ color: '#FF6B9D' }}>
                  {newContact.contact_code}
                </p>
                <p className="text-xs" style={{ color: '#8B8B9E' }}>Berikan kode ini kepada kontak Anda</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => copyCode(newContact.contact_code)}
                  className="py-2.5 rounded-xl text-sm font-semibold glass"
                >
                  📋 Salin Kode
                </button>
                <button
                  onClick={() => { setNewContact(null); setShowForm(false); }}
                  className="py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#FF6B9D,#FF8E53)' }}
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            /* Form nama kontak */
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide block" style={{ color: '#8B8B9E' }}>
                Nama Kontak
              </label>
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  autoFocus
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                />
                <button
                  type="submit"
                  disabled={adding || !name.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#FF6B9D,#FF8E53)' }}
                >
                  {adding ? '...' : 'Tambah'}
                </button>
              </form>
              {addError && <p className="text-xs" style={{ color: '#FF4757' }}>{addError}</p>}
              <p className="text-xs" style={{ color: '#8B8B9E' }}>
                Sistem akan otomatis membuat kode unik untuk kontak ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Daftar kontak */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ background: 'rgba(255,107,157,0.1)' }}>
              <span className="text-4xl">👥</span>
            </div>
            <p className="font-semibold text-lg">Belum ada kontak</p>
            <p className="text-sm mt-2 mb-5" style={{ color: '#8B8B9E' }}>
              Tambahkan kontak pertama dan bagikan kode login kepada mereka.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-xl font-semibold glow-pink"
              style={{ background: 'linear-gradient(135deg,#FF6B9D,#FF8E53)' }}
            >
              + Tambah Kontak Pertama
            </button>
          </div>
        ) : (
          contacts.map(c => (
            <ContactCard
              key={c.contact_code}
              contact={c}
              onReset={handleReset}
              onDelete={handleDelete}
              onCopy={copyCode}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ContactCard({ contact, onReset, onDelete, onCopy }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    onCopy?.(contact.contact_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#FF6B9D,#00F5FF)' }}
        >
          {contact.avatar_url
            ? <img src={contact.avatar_url} className="w-full h-full object-cover" alt="" />
            : (contact.name?.[0] || '?')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{contact.name}</p>
          <p className="font-mono text-sm" style={{ color: '#00F5FF' }}>{contact.contact_code}</p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
          style={{
            background: contact.is_active ? 'rgba(0,245,160,0.12)' : 'rgba(255,71,87,0.12)',
            color: contact.is_active ? '#00F5A0' : '#FF4757'
          }}
        >
          {contact.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      {contact.created_at && (
        <p className="text-xs mb-3" style={{ color: '#8B8B9E' }}>
          Ditambah {formatTime(contact.created_at)}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: copied ? 'rgba(0,245,160,0.15)' : 'rgba(255,255,255,0.06)',
            color: copied ? '#00F5A0' : '#fff'
          }}
        >
          {copied ? '✓ Disalin' : '📋 Salin Kode'}
        </button>
        <button
          onClick={() => onReset?.(contact.contact_code)}
          title="Reset kode login"
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700' }}
        >
          🔄
        </button>
        <button
          onClick={() => onDelete?.(contact.contact_code)}
          title="Hapus kontak"
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,71,87,0.12)', color: '#FF4757' }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

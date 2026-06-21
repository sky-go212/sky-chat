import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import GroupChat from './GroupChat.jsx';
import PersonalChat from './PersonalChat.jsx';
import ContactManager from '../components/ContactManager.jsx';
import TabSwitcher from '../components/TabSwitcher.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import { API_BASE } from '../utils/constants.js';

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
  const [showContacts, setShowContacts] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { on } = useWebSocket(user?.subServerId);

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

  const tabs = [
    { id: 'group', label: '👥 Ruang Umum' },
    { id: 'personal', label: '💬 Chat Pribadi' }
  ];

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <ChatHeader
        title={subServerInfo?.name || 'SubServer Chat'}
        subtitle={`${contacts.length} kontak`}
        onlineCount={onlineCount}
        onSettings={() => setShowMenu(!showMenu)}
      />

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-14 right-3 z-50 glass-dark rounded-xl py-1 w-44 animate-fade-in" onClick={() => setShowMenu(false)}>
          {user?.role === 'utama' && (
            <button onClick={() => setShowContacts(true)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10">👥 Kelola Kontak</button>
          )}
          <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10">⚙️ Pengaturan</button>
          <div className="h-px mx-3 my-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm" style={{ color: '#FF4757' }}>🚪 Keluar</button>
        </div>
      )}

      <TabSwitcher tabs={tabs} active={tab} onChange={setTab} />

      <div className="flex-1 overflow-hidden">
        {tab === 'group' ? (
          <GroupChat subServerId={user?.subServerId} subServerName={subServerInfo?.name} onlineContacts={contacts.filter(c => onlineMap[c.contact_code])} />
        ) : (
          <PersonalChat subServerId={user?.subServerId} contacts={contacts} myCode={user?.contactCode} onlineMap={onlineMap} />
        )}
      </div>

      {showContacts && <ContactManager onClose={() => setShowContacts(false)} />}
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </div>
  );
}

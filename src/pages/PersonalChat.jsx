import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import ChatBubble from '../components/ChatBubble.jsx';
import InputBar from '../components/InputBar.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import { API_BASE } from '../utils/constants.js';
import { formatTime, truncate } from '../utils/formatters.js';

function api(path, opts = {}) {
  const token = localStorage.getItem('ssc_token');
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }
  }).then(r => r.json());
}

function ChatRoomItem({ room, myCode, onOpen }) {
  const isA = room.participant_a === myCode;
  const partnerName = isA ? room.name_b : room.name_a;
  const partnerAvatar = isA ? room.avatar_b : room.avatar_a;
  const unread = isA ? room.unread_a : room.unread_b;

  return (
    <button onClick={() => onOpen(room)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 active:bg-white/10">
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6B9D, #00F5FF)' }}>
          {partnerAvatar ? <img src={partnerAvatar} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full font-bold text-lg">{partnerName?.[0] || '?'}</span>}
        </div>
        {room.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 animate-pulse-dot" style={{ background: '#00F5A0', borderColor: '#0A0A0F' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{partnerName}</p>
          <p className="text-xs flex-shrink-0" style={{ color: '#8B8B9E' }}>{room.last_message_at ? formatTime(room.last_message_at) : ''}</p>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm truncate flex-1 mr-2" style={{ color: '#8B8B9E' }}>{truncate(room.last_message_preview, 35) || 'Belum ada pesan'}</p>
          {unread > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#FF6B9D' }}>{unread}</span>}
        </div>
      </div>
    </button>
  );
}

function PersonalChatRoom({ room, myCode, subServerId, onBack, contacts }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typers, setTypers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const { connected, send, on } = useWebSocket(subServerId);
  const isA = room.participant_a === myCode;
  const partnerCode = isA ? room.participant_b : room.participant_a;
  const partnerName = isA ? room.name_b : room.name_a;

  useEffect(() => {
    api(`/api/chat/personal/history?with=${partnerCode}`)
      .then(data => { if (data.success) setMessages(data.messages || []); })
      .finally(() => setLoading(false));
  }, [partnerCode]);

  useEffect(() => {
    const off1 = on('message', (data) => {
      if (data.chatType === 'personal' && (data.message.sender_code === partnerCode || data.message.sender_code === myCode)) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        if (data.message.sender_code === partnerCode) send({ type: 'read', messageId: data.message.id });
      }
    });
    const off2 = on('typing', (data) => {
      if (data.chatType === 'personal' && data.senderCode === partnerCode) {
        setTypers(data.isTyping ? [partnerName] : []);
      }
    });
    return () => { off1(); off2(); };
  }, [on, partnerCode, partnerName, myCode, send]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async ({ type, content, file, caption }) => {
    if (type === 'text') {
      send({ type: 'message', content, contentType: 'text', chatType: 'personal', receiver: partnerCode, replyTo: replyTo?.id });
    }
    setReplyTo(null);
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ background: '#0A0A0F' }}>
      <ChatHeader title={partnerName} subtitle={room.isOnline ? 'Online' : 'Offline'} onlineCount={room.isOnline ? 1 : 0} onBack={onBack} />
      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {loading ? (
          <div className="space-y-3 px-3">
            {[1,2,3].map(i => <div key={i} className={`h-12 rounded-xl shimmer ${i % 2 ? 'ml-auto w-2/3' : 'w-2/3'}`} />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold">Belum ada pesan</p>
            <p className="text-sm mt-1" style={{ color: '#8B8B9E' }}>Kirim pesan pertama ke {partnerName}</p>
          </div>
        ) : messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} isMine={msg.sender_code === myCode} senderName={partnerName} onReply={setReplyTo} />
        ))}
        <TypingIndicator typers={typers} />
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} disabled={!connected} />
    </div>
  );
}

export default function PersonalChat({ subServerId, contacts = [], myCode, onlineMap = {} }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    api('/api/chat/personal/rooms')
      .then(data => { if (data.success) setRooms(data.rooms || []); })
      .finally(() => setLoading(false));
  }, []);

  const openRoom = async (contact) => {
    const existingRoom = rooms.find(r => (r.participant_a === myCode && r.participant_b === contact.contact_code) || (r.participant_b === myCode && r.participant_a === contact.contact_code));
    if (existingRoom) { setActiveRoom({ ...existingRoom, isOnline: !!onlineMap[contact.contact_code] }); return; }
    const data = await api('/api/chat/personal/rooms', { method: 'POST', body: JSON.stringify({ partnerCode: contact.contact_code }) });
    if (data.success) { setRooms(prev => [data.room, ...prev]); setActiveRoom({ ...data.room, isOnline: !!onlineMap[contact.contact_code] }); }
  };

  const roomsWithNames = rooms.map(r => ({
    ...r,
    name_a: contacts.find(c => c.contact_code === r.participant_a)?.name || r.participant_a,
    name_b: contacts.find(c => c.contact_code === r.participant_b)?.name || r.participant_b,
    avatar_a: contacts.find(c => c.contact_code === r.participant_a)?.avatar_url,
    avatar_b: contacts.find(c => c.contact_code === r.participant_b)?.avatar_url,
    isOnline: !!(onlineMap[r.participant_a] || onlineMap[r.participant_b]),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Contacts row */}
      <div className="flex-shrink-0 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B8B9E' }}>Kontak</p>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {contacts.map(c => (
            <button key={c.contact_code} onClick={() => openRoom(c)} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative">
                <div className="w-11 h-11 rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6B9D, #00F5FF)' }}>
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full font-bold">{c.name?.[0]}</span>}
                </div>
                {onlineMap[c.contact_code] && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 animate-pulse-dot" style={{ background: '#00F5A0', borderColor: '#0A0A0F' }} />}
              </div>
              <p className="text-xs truncate w-11 text-center" style={{ color: '#8B8B9E' }}>{c.name?.split(' ')[0]}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat rooms list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="space-y-1">{[1,2,3].map(i => <div key={i} className="h-16 mx-3 rounded-xl shimmer" />)}</div>
        ) : roomsWithNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold">Belum ada chat pribadi</p>
            <p className="text-sm mt-1" style={{ color: '#8B8B9E' }}>Ketuk kontak di atas untuk memulai</p>
          </div>
        ) : roomsWithNames.map(r => (
          <ChatRoomItem key={r.id} room={r} myCode={myCode} onOpen={setActiveRoom} />
        ))}
      </div>

      {activeRoom && (
        <PersonalChatRoom room={activeRoom} myCode={myCode} subServerId={subServerId} onBack={() => setActiveRoom(null)} contacts={contacts} />
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import ChatBubble from '../components/ChatBubble.jsx';
import InputBar from '../components/InputBar.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import { API_BASE } from '../utils/constants.js';

function api(path, opts = {}) {
  const token = localStorage.getItem('ssc_token');
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }
  }).then(r => r.json());
}

export default function GroupChat({ subServerId, subServerName, onlineContacts = [] }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typers, setTypers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const { connected, send, on } = useWebSocket(subServerId);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api('/api/chat/group/history');
      if (data.success) setMessages(data.messages || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const off1 = on('message', (data) => {
      if (data.chatType === 'group') {
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });
    const off2 = on('typing', (data) => {
      if (data.chatType === 'group') {
        setTypers(prev => data.isTyping ? [...new Set([...prev, data.senderName])] : prev.filter(n => n !== data.senderName));
      }
    });
    const off3 = on('reaction', (data) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reaction: data.emoji } : m));
    });
    const off4 = on('delete', (data) => {
      if (data.scope === 'all') setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, deleted: true } : m));
    });
    return () => { off1(); off2(); off3(); off4(); };
  }, [on]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { ref: scrollRef, refreshing } = usePullToRefresh(loadHistory);

  const handleSend = async ({ type, content, file, caption }) => {
    if (type === 'text') {
      send({ type: 'message', content, contentType: 'text', chatType: 'group', replyTo: replyTo?.id });
    } else if (file) {
      try {
        const urlRes = await api('/api/media/upload', { method: 'POST', body: JSON.stringify({ type, chatType: 'group' }) });
        if (!urlRes.uploadUrl) return;
        await fetch(urlRes.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        send({ type: 'message', content: urlRes.fileUrl, contentType: type, chatType: 'group', caption, fileSize: file.size, replyTo: replyTo?.id });
      } catch {}
    }
    setReplyTo(null);
  };

  const handleTyping = (isTyping) => {
    send({ type: 'typing', isTyping, chatType: 'group' });
    clearTimeout(typingTimer.current);
    if (isTyping) typingTimer.current = setTimeout(() => send({ type: 'typing', isTyping: false, chatType: 'group' }), 3000);
  };

  const handleReaction = (messageId, emoji) => {
    send({ type: 'reaction', messageId, emoji });
  };

  const handleDelete = (messageId, scope) => {
    send({ type: 'delete', messageId, scope });
    if (scope === 'me') setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted: true } : m));
  };

  const buildSenderMap = () => {
    const map = {};
    onlineContacts.forEach(c => { map[c.contact_code] = c.name; });
    return map;
  };
  const senderMap = buildSenderMap();

  return (
    <div className="flex flex-col h-full">
      {refreshing && (
        <div className="flex justify-center py-2">
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B9D' }} />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {loading ? (
          <div className="space-y-3 px-3">
            {[1,2,3,4].map(i => <div key={i} className={`h-12 rounded-xl shimmer ${i % 2 === 0 ? 'ml-auto w-2/3' : 'w-2/3'}`} />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold">Belum ada pesan</p>
            <p className="text-sm mt-1" style={{ color: '#8B8B9E' }}>Mulai percakapan pertama!</p>
          </div>
        ) : (
          messages.map(msg => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_code === user?.contactCode}
              senderName={senderMap[msg.sender_code] || msg.sender_code}
              onReply={setReplyTo}
              onDelete={handleDelete}
              onReaction={handleReaction}
            />
          ))
        )}
        <TypingIndicator typers={typers} />
        <div ref={bottomRef} />
      </div>

      <InputBar
        onSend={handleSend}
        onTyping={handleTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={!connected}
      />
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE, SESSION_KEY } from '../utils/constants.js';

export function useWebSocket(subServerId) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const listeners = useRef(new Map());

  const connect = useCallback(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token || !subServerId) return;

    try {
      ws.current = new WebSocket(`${WS_BASE}/ws?subServerId=${subServerId}&token=${token}`);

      ws.current.onopen = () => {
        setConnected(true);
        clearTimeout(reconnectTimer.current);
        ws.current.send(JSON.stringify({ type: 'ping' }));
      };

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data === 'pong') return;
          setLastMessage(data);
          const handler = listeners.current.get(data.type);
          if (handler) handler(data);
        } catch {}
      };

      ws.current.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = () => {
        ws.current?.close();
      };
    } catch {}
  }, [subServerId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const on = useCallback((type, handler) => {
    listeners.current.set(type, handler);
    return () => listeners.current.delete(type);
  }, []);

  const sendBatch = useCallback((messages) => {
    send({ type: 'batch', messages, timestamp: Date.now() });
  }, [send]);

  return { connected, lastMessage, send, sendBatch, on };
}

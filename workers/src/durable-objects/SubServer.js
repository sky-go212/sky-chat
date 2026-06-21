export class SubServer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sessions = new Map();

    // Restore sessions dari attachment saat DO bangun dari hibernate
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment();
      if (att) this.sessions.set(ws, att);
    }

    // Auto-response ping/pong — tidak membangunkan DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong')
    );
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }

    const token = url.searchParams.get('token');
    const subServerId = url.searchParams.get('subServerId');
    if (!token || !subServerId) return new Response('Missing params', { status: 400 });

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);

    // Verifikasi session dari KV
    let sessionData = null;
    try {
      const raw = await this.env.KV.get(`session:${token}`);
      sessionData = raw ? JSON.parse(raw) : null;
    } catch {}

    if (!sessionData || sessionData.subServerId !== subServerId) {
      server.close(1008, 'Invalid session');
      return new Response(null, { status: 101, webSocket: client });
    }

    const state = {
      contactCode: sessionData.contactCode,
      name: sessionData.name || sessionData.contactCode,
      role: sessionData.role,
      subServerId,
      joinedAt: Date.now()
    };

    server.serializeAttachment(state);
    this.sessions.set(server, state);

    // Broadcast join ke semua
    await this.broadcast({ type: 'join', contactCode: state.contactCode, name: state.name }, server);

    // Kirim presence ke semua
    await this.broadcastPresence(state.contactCode, true);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const session = this.sessions.get(ws);
    if (!session) return;

    let data;
    try { data = JSON.parse(message); } catch { return; }

    // Handle batch
    if (data.type === 'batch' && Array.isArray(data.messages)) {
      for (const msg of data.messages) await this.handleMessage(ws, session, msg);
      return;
    }

    await this.handleMessage(ws, session, data);
  }

  async handleMessage(ws, session, data) {
    const subId = session.subServerId;

    switch (data.type) {
      case 'message': {
        const msgData = {
          type: 'message',
          chatType: data.chatType || 'group',
          message: {
            sender_code: session.contactCode,
            senderName: session.name,
            content_type: data.contentType || 'text',
            content: data.content,
            caption: data.caption || null,
            file_size: data.fileSize || null,
            duration: data.duration || null,
            reply_to: data.replyTo || null,
            created_at: new Date().toISOString(),
            status: 'sent',
            deleted: false,
          }
        };

        // Broadcast dulu (cepat), simpan ke DB belakang
        if (data.chatType === 'personal' && data.receiver) {
          msgData.message.receiver_code = data.receiver;
          await this.sendTo(data.receiver, msgData);
          // Echo ke pengirim
          ws.send(JSON.stringify({ ...msgData, message: { ...msgData.message, status: 'sent' } }));
        } else {
          await this.broadcast(msgData, null);
        }

        // Simpan ke D1 tanpa block broadcast
        this.ctx.waitUntil(this.saveMessage(subId, session.contactCode, data));
        break;
      }

      case 'typing': {
        const typingMsg = {
          type: 'typing',
          chatType: data.chatType || 'group',
          senderCode: session.contactCode,
          senderName: session.name,
          isTyping: !!data.isTyping
        };
        if (data.chatType === 'personal' && data.receiver) {
          await this.sendTo(data.receiver, typingMsg);
        } else {
          await this.broadcast(typingMsg, ws);
        }
        break;
      }

      case 'read': {
        const sender = await this.findSenderOf(subId, data.messageId);
        if (sender) {
          await this.sendTo(sender, { type: 'read', messageId: data.messageId, reader: session.contactCode });
        }
        this.ctx.waitUntil(
          this.env.DB.prepare(`UPDATE personal_messages_${subId} SET status = 'read' WHERE id = ? AND receiver_code = ?`)
            .bind(data.messageId, session.contactCode).run().catch(() => {})
        );
        break;
      }

      case 'reaction': {
        await this.broadcast({ type: 'reaction', messageId: data.messageId, contactCode: session.contactCode, emoji: data.emoji }, null);
        const table = data.chatType === 'group' ? `group_messages_${subId}` : `personal_messages_${subId}`;
        this.ctx.waitUntil(
          this.env.DB.prepare(`UPDATE ${table} SET reaction = ? WHERE id = ?`).bind(data.emoji, data.messageId).run().catch(() => {})
        );
        break;
      }

      case 'delete': {
        await this.broadcast({ type: 'delete', messageId: data.messageId, scope: data.scope }, null);
        if (data.scope === 'all') {
          const table = data.chatType === 'group' ? `group_messages_${subId}` : `personal_messages_${subId}`;
          this.ctx.waitUntil(
            this.env.DB.prepare(`UPDATE ${table} SET deleted = 1 WHERE id = ? AND sender_code = ?`).bind(data.messageId, session.contactCode).run().catch(() => {})
          );
        }
        break;
      }

      case 'sync': {
        const msgs = await this.env.DB.prepare(
          `SELECT * FROM group_messages_${subId} WHERE id > ? AND deleted = 0 ORDER BY created_at LIMIT 50`
        ).bind(data.lastMessageId || 0).all().catch(() => ({ results: [] }));
        ws.send(JSON.stringify({ type: 'sync_response', messages: msgs.results }));
        break;
      }
    }
  }

  async saveMessage(subId, senderCode, data) {
    try {
      if (data.chatType === 'personal' && data.receiver) {
        const result = await this.env.DB.prepare(
          `INSERT INTO personal_messages_${subId} (sender_code, receiver_code, content_type, content, caption, file_size, duration, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(senderCode, data.receiver, data.contentType || 'text', data.content, data.caption || null, data.fileSize || null, data.duration || null, data.replyTo || null).run();
        // Update chat room
        const a = [senderCode, data.receiver].sort()[0];
        const b = [senderCode, data.receiver].sort()[1];
        const isA = a === senderCode;
        await this.env.DB.prepare(
          `INSERT INTO personal_chat_rooms_${subId} (participant_a, participant_b, last_message_at, last_message_preview, ${isA ? 'unread_b' : 'unread_a'}) VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1) ON CONFLICT(participant_a, participant_b) DO UPDATE SET last_message_at=CURRENT_TIMESTAMP, last_message_preview=excluded.last_message_preview, ${isA ? 'unread_b' : 'unread_a'}=${isA ? 'unread_b' : 'unread_a'}+1`
        ).bind(a, b, (data.content || '').slice(0, 80)).run();
      } else {
        await this.env.DB.prepare(
          `INSERT INTO group_messages_${subId} (sender_code, content_type, content, caption, file_size, duration, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(senderCode, data.contentType || 'text', data.content, data.caption || null, data.fileSize || null, data.duration || null, data.replyTo || null).run();
      }
    } catch (e) {
      console.error('saveMessage error:', e.message);
    }
  }

  async findSenderOf(subId, messageId) {
    try {
      const row = await this.env.DB.prepare(`SELECT sender_code FROM personal_messages_${subId} WHERE id = ?`).bind(messageId).first();
      return row?.sender_code || null;
    } catch { return null; }
  }

  async broadcast(message, exclude = null) {
    const allSockets = this.ctx.getWebSockets();
    const data = JSON.stringify(message);
    for (const ws of allSockets) {
      if (ws !== exclude) {
        try { ws.send(data); } catch {}
      }
    }
  }

  async sendTo(contactCode, message) {
    for (const [ws, state] of this.sessions) {
      if (state.contactCode === contactCode) {
        try { ws.send(JSON.stringify(message)); } catch {}
        return;
      }
    }
  }

  async broadcastPresence(contactCode, isOnline) {
    await this.broadcast({ type: 'presence', contactCode, isOnline, timestamp: Date.now() });
  }

  async webSocketClose(ws, code, reason) {
    const session = this.sessions.get(ws);
    if (session) {
      this.sessions.delete(ws);
      await this.broadcastPresence(session.contactCode, false);
      await this.broadcast({ type: 'leave', contactCode: session.contactCode }, null);
    }
  }

  async webSocketError(ws, error) {
    this.sessions.delete(ws);
  }
}

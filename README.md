# SKY-CHAT

🔒 **Private chat with isolated rooms. No phone. No email. No ads. Zero tracking.**

Built with React + Vite + Tailwind CSS on the frontend, and Cloudflare Workers + Durable Objects + D1 + KV + R2 on the backend. Real-time WebSocket hibernation, auto-delete policy, client-side media compression, and TWA-ready for native APK builds.

---

## What is SKY-CHAT?

A Progressive Web App (PWA) for private group messaging where each owner gets an isolated room. Members are invited exclusively by the room owner via unique access codes. No phone numbers, no email addresses, no discovery — just pure privacy.

## Key Features

- **Isolated SubServers** — Each group is a completely separate room with its own database and storage
- **Code-Only Login** — No passwords, no phone numbers, no email. Just unique access codes
- **Real-Time Chat** — WebSocket via Cloudflare Durable Objects with hibernation for zero-cost idle
- **Auto-Delete** — Text messages vanish after 48 hours, media after 24 hours
- **Client-Side Media Compression** — Images, voice, and video compressed before upload
- **Offline-First** — Service Worker with background sync for queued messages
- **TWA Ready** — Convert to native Android APK via Trusted Web Activity

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Cloudflare Workers |
| Real-Time | Durable Objects + WebSocket Hibernation |
| Database | D1 (SQLite) |
| Cache/Config | KV |
| Storage | R2 (zero egress) |
| Cron | Workers Cron Triggers |
| TWA | PWABuilder / Bubblewrap |

## Architecture

```
PUSAT SERVER (Admin Dashboard)
  ├── Create SubServer
  ├── Generate owner access code
  └── Monitoring & billing

SUBSERVER (Isolated Instance)
  ├── Durable Object (Chat Coordinator)
  ├── D1 Database (Chat History)
  ├── KV Storage (Metadata & Sessions)
  └── R2 Storage (Media Files)

CLIENT (PWA / TWA APK)
  ├── React + Vite + Tailwind
  ├── WebSocket connection
  ├── Offline-first Service Worker
  └── Client-side media compression
```

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/sky-chat.git
cd sky-chat

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Environment Variables

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
D1_DATABASE_ID=your_d1_database_id
KV_NAMESPACE_ID=your_kv_namespace_id
R2_BUCKET_NAME=your_r2_bucket_name
JWT_SECRET=your_jwt_secret
```

## Project Structure

```
sky-chat/
├── public/           # Static assets (PWA files, icons, service worker)
├── src/              # React frontend (components, pages, hooks, utils)
├── workers/          # Cloudflare Workers backend (handlers, DO, cron)
├── database/         # D1 schema and migrations
└── scripts/          # Build and deployment scripts
```

## Security

- HTTPS/TLS for all transport
- WebSocket over wss:// only
- JWT sessions with device fingerprinting
- Rate limiting per IP and per access code
- Cross-SubServer isolation on every request
- Audit logging for all critical actions

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ for privacy-first communication.

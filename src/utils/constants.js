export const API_BASE = import.meta.env.VITE_API_URL || 'https://subserver-chat.workers.dev';
export const WS_BASE = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://');

export const CODE_FORMATS = {
  UTAMA: /^UTAMA-[A-Z0-9]{4}-\d{3}$/,
  USR: /^USR-[A-Z0-9]{4}-\d{3}$/,
};

export const MESSAGE_TYPES = { TEXT: 'text', IMAGE: 'image', VOICE: 'voice', VIDEO: 'video' };
export const MESSAGE_STATUS = { SENT: 'sent', DELIVERED: 'delivered', READ: 'read' };
export const USER_ROLES = { ADMIN: 'admin', UTAMA: 'utama', KONTAK: 'kontak' };

export const MEDIA_LIMITS = {
  IMAGE: { maxInput: 10 * 1024 * 1024, maxOutput: 500 * 1024, quality: 0.75, maxWidth: 1200 },
  VOICE: { maxInput: 5 * 1024 * 1024, maxOutput: 500 * 1024 },
  VIDEO: { maxInput: 50 * 1024 * 1024, maxOutput: 5 * 1024 * 1024 },
  AVATAR: { maxOutput: 100 * 1024, size: 300, quality: 0.8 },
};

export const AUTO_DELETE = { TEXT_HOURS: 48, MEDIA_HOURS: 24 };
export const SESSION_KEY = 'ssc_token';
export const ADMIN_SECRET_KEY = 'ssc_admin';

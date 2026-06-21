-- Audit log (global, bukan per-SubServer)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event, created_at DESC);

-- Tabel per-SubServer dibuat otomatis saat SubServer baru dibuat
-- via admin handler. Template:

-- contacts_{subId}
-- CREATE TABLE contacts_{subId} (
--   contact_code TEXT PRIMARY KEY,
--   name TEXT NOT NULL,
--   avatar_url TEXT,
--   added_by TEXT DEFAULT 'UTAMA',
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   is_active INTEGER DEFAULT 1
-- );

-- group_messages_{subId}
-- CREATE TABLE group_messages_{subId} (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   sender_code TEXT NOT NULL,
--   content_type TEXT NOT NULL,
--   content TEXT NOT NULL,
--   caption TEXT,
--   file_size INTEGER,
--   duration TEXT,
--   reaction TEXT,
--   reply_to INTEGER,
--   deleted INTEGER DEFAULT 0,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- personal_messages_{subId}
-- CREATE TABLE personal_messages_{subId} (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   sender_code TEXT NOT NULL,
--   receiver_code TEXT NOT NULL,
--   content_type TEXT NOT NULL,
--   content TEXT NOT NULL,
--   caption TEXT,
--   file_size INTEGER,
--   duration TEXT,
--   reaction TEXT,
--   reply_to INTEGER,
--   status TEXT DEFAULT 'sent',
--   deleted INTEGER DEFAULT 0,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- personal_chat_rooms_{subId}
-- CREATE TABLE personal_chat_rooms_{subId} (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   participant_a TEXT NOT NULL,
--   participant_b TEXT NOT NULL,
--   last_message_at DATETIME,
--   last_message_preview TEXT,
--   unread_a INTEGER DEFAULT 0,
--   unread_b INTEGER DEFAULT 0,
--   UNIQUE(participant_a, participant_b)
-- );

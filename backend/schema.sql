PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  device_id TEXT UNIQUE,
  push_token TEXT,
  nudge_level INTEGER NOT NULL DEFAULT 1 CHECK (nudge_level BETWEEN 0 AND 3),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (email IS NOT NULL OR device_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS pairs (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user2_id TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'awaiting' CHECK (status IN ('awaiting', 'active', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user1_id) REFERENCES users(id),
  FOREIGN KEY (user2_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  timing TEXT,
  budget_range TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (pair_id) REFERENCES pairs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pair_nudge_state (
  pair_id TEXT PRIMARY KEY,
  last_nudged_at TEXT,
  last_wish_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pair_id) REFERENCES pairs(id) ON DELETE CASCADE,
  FOREIGN KEY (last_wish_id) REFERENCES wishes(id)
);

CREATE INDEX IF NOT EXISTS idx_pairs_user1 ON pairs(user1_id);
CREATE INDEX IF NOT EXISTS idx_pairs_user2 ON pairs(user2_id);
CREATE INDEX IF NOT EXISTS idx_wishes_pair_status_priority ON wishes(pair_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON wishes(created_at);

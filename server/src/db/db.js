'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { config } = require('../config/env');
const { logger } = require('../lib/logger');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'ops.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    password_hash TEXT,
    role TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    expires_at TEXT,
    created_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT,
    fetched_at TEXT,
    ttl_seconds INTEGER,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    idem_key TEXT UNIQUE,
    source_id TEXT,
    sop_id TEXT,
    sop_title TEXT,
    assignee TEXT,
    severity TEXT,
    metric TEXT,
    comparator TEXT,
    threshold REAL,
    value REAL,
    fired_at TEXT,
    due_at TEXT,
    sla_hours INTEGER,
    status TEXT,
    ack_at TEXT,
    resolved_at TEXT,
    met_sla INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
  CREATE INDEX IF NOT EXISTS idx_actions_assignee ON actions(assignee);

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    ts TEXT,
    actor TEXT,
    action TEXT,
    entity TEXT,
    detail TEXT
  );
`);

function uuid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function audit(actor, action, entity, detail) {
  try {
    db.prepare(
      'INSERT INTO audit_log (id, ts, actor, action, entity, detail) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      uuid(),
      nowIso(),
      actor || 'system',
      action || '',
      entity || '',
      typeof detail === 'string' ? detail : JSON.stringify(detail || {})
    );
  } catch (err) {
    logger.warn('audit write failed', err.message);
  }
}

function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const hash = bcrypt.hashSync(config.demoPassword, 10);
  const insert = db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const ts = nowIso();
  insert.run(uuid(), 'founder@demo.local', 'Founder', hash, 'founder', ts);
  insert.run(uuid(), 'analyst@demo.local', 'Analyst', hash, 'analyst', ts);
  logger.info('Seeded demo users: founder@demo.local, analyst@demo.local');
}

seedUsers();

module.exports = {
  db,
  uuid,
  nowIso,
  audit,
  DB_FILE,
  DATA_DIR,
};

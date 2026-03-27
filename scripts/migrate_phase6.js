require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS accountability_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    partner_email VARCHAR(255) NOT NULL,
    partner_password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accountability_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    notified_partner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acct_events ON accountability_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    client_version VARCHAR(20),
    is_blocking_active BOOLEAN,
    blocked_domain_count INTEGER,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_user ON heartbeats (user_id, last_seen_at DESC);
`;

async function runMigration() {
  try {
    console.log('Running migration...');
    const res = await pool.query(migration);
    console.log('Migration successful:', res.command || 'OK');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

runMigration();

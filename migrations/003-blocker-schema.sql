-- Migration 003: Blocker Schema
CREATE TABLE blocked_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(512) NOT NULL,
    source VARCHAR(255) NOT NULL DEFAULT 'manual',
    temp_unblock_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, domain)
);
CREATE INDEX idx_blocked_user ON blocked_domains (user_id) WHERE is_active = TRUE;

CREATE TABLE blocklist_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT,
    domain_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

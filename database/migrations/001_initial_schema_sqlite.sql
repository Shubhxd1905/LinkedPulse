-- LinkedPulse SQLite Schema Migration v1
-- Target: Local Development SQLite (linkedpulse.db)

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at REAL NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at REAL NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_source TEXT NOT NULL DEFAULT 'manual',
    headline TEXT NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    skills TEXT NOT NULL DEFAULT '[]',
    education TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '[]',
    projects TEXT NOT NULL DEFAULT '',
    target_role TEXT NOT NULL DEFAULT 'Full-Stack Engineer',
    experience_status TEXT NOT NULL DEFAULT 'fresher',
    career_intent TEXT NOT NULL DEFAULT 'current-field',
    profile_url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

CREATE TABLE IF NOT EXISTS profile_audits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    career_intent TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    overall_rating TEXT NOT NULL,
    engine_used TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    category_scores TEXT NOT NULL DEFAULT '{}',
    improvements TEXT NOT NULL DEFAULT '{}',
    keyword_insights TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profile_audits_user_id ON profile_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_audits_created_at ON profile_audits(created_at);

CREATE TABLE IF NOT EXISTS post_drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    hook TEXT NOT NULL DEFAULT '',
    alternative_hooks TEXT NOT NULL DEFAULT '[]',
    hashtags TEXT NOT NULL DEFAULT '[]',
    visual_summary TEXT NOT NULL DEFAULT '',
    ai_metadata TEXT NOT NULL DEFAULT '{}',
    tone TEXT NOT NULL DEFAULT 'professional',
    length TEXT NOT NULL DEFAULT 'medium',
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    published_at TEXT,
    linkedin_post_urn TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_post_drafts_user_id ON post_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_updated_at ON post_drafts(updated_at);

CREATE TABLE IF NOT EXISTS linkedin_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_urn TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_email TEXT,
    member_picture TEXT,
    profile_url TEXT,
    encrypted_access_token TEXT NOT NULL,
    token_expires_at REAL NOT NULL,
    connected_at TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_user_id ON linkedin_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_member_urn ON linkedin_connections(member_urn);

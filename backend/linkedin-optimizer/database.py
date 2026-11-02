"""
database.py
===========
Modular persistent database layer for LinkedPulse.
Supports dual database engines:
1. SQLite (default, zero-configuration local development)
2. PostgreSQL (Supabase / Render production deployment via DATABASE_URL)

Features:
- Dual-engine connection manager (SQLite & PostgreSQL)
- Seamless parameter adaptation (? for SQLite, %s for PostgreSQL)
- Schema migrations with versioning (schema_migrations table)
- Foreign key enforcement and cascading deletes
- Parameterized SQL queries preventing SQL injection
- Connection context manager with automatic rollback on error
- Comprehensive indexes for performant lookups
- 100% free-tier compatible with Supabase Free PostgreSQL
"""

import os
import sqlite3
import json
import time
import uuid
import re
from typing import Optional, Dict, Any, List, Tuple, Mapping
from contextlib import contextmanager

# Default database file path in the linkedin-optimizer directory
DEFAULT_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "linkedpulse.db")
DATABASE_PATH = os.environ.get("DATABASE_PATH", DEFAULT_DB_FILE)


def is_postgres() -> bool:
    """Returns True if DATABASE_URL is set to a PostgreSQL connection."""
    db_url = os.environ.get("DATABASE_URL", "").strip().lower()
    return db_url.startswith("postgres://") or db_url.startswith("postgresql://")


def get_db_path() -> str:
    """Returns the current database path (useful for testing SQLite mode)."""
    return os.environ.get("DATABASE_PATH", DEFAULT_DB_FILE)


def get_database_url() -> Optional[str]:
    """Returns normalized DATABASE_URL for PostgreSQL connections."""
    db_url = os.environ.get("DATABASE_URL", "").strip()
    if not db_url:
        return None
    # Normalize postgres:// to postgresql:// for compatibility with modern drivers
    if db_url.startswith("postgres://"):
        db_url = "postgresql://" + db_url[len("postgres://"):]
    return db_url


def adapt_sqlite_query_to_postgres(sql: str) -> str:
    """
    Converts SQLite '?' parameter placeholders to PostgreSQL '%s' placeholders.
    Guarantees that '?' characters inside single-quoted string literals, double-quoted
    identifiers, comments, or PostgreSQL JSON operators (e.g., '?|', '?&') are
    strictly preserved without corruption.
    """
    tokens = []
    in_single_quote = False
    in_double_quote = False
    in_line_comment = False
    in_block_comment = False
    i = 0
    n = len(sql)

    while i < n:
        ch = sql[i]
        next_ch = sql[i + 1] if i + 1 < n else ""

        if in_line_comment:
            tokens.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1
        elif in_block_comment:
            tokens.append(ch)
            if ch == "*" and next_ch == "/":
                tokens.append(next_ch)
                in_block_comment = False
                i += 2
            else:
                i += 1
        elif in_single_quote:
            tokens.append(ch)
            if ch == "'":
                if next_ch == "'":  # Escaped single quote ('')
                    tokens.append(next_ch)
                    i += 2
                else:
                    in_single_quote = False
                    i += 1
            else:
                i += 1
        elif in_double_quote:
            tokens.append(ch)
            if ch == '"':
                if next_ch == '"':  # Escaped double quote ("")
                    tokens.append(next_ch)
                    i += 2
                else:
                    in_double_quote = False
                    i += 1
            else:
                i += 1
        else:
            # Code region outside quotes and comments
            if ch == "-" and next_ch == "-":
                tokens.append(ch)
                tokens.append(next_ch)
                in_line_comment = True
                i += 2
            elif ch == "/" and next_ch == "*":
                tokens.append(ch)
                tokens.append(next_ch)
                in_block_comment = True
                i += 2
            elif ch == "'":
                tokens.append(ch)
                in_single_quote = True
                i += 1
            elif ch == '"':
                tokens.append(ch)
                in_double_quote = True
                i += 1
            elif ch == "?":
                # Check for PostgreSQL JSON operators: ?|, ?& or escaped ??
                if next_ch in ("|", "&", "?"):
                    tokens.append(ch)
                    tokens.append(next_ch)
                    i += 2
                else:
                    tokens.append("%s")
                    i += 1
            else:
                tokens.append(ch)
                i += 1

    return "".join(tokens)


# -----------------------------------------------------------------------------
# Dual-Engine Connection & Cursor Wrappers
# -----------------------------------------------------------------------------

class DualCursor:
    """
    Cursor wrapper providing uniform interface across SQLite and PostgreSQL.
    Adapts SQLite '?' placeholders to PostgreSQL '%s' placeholders automatically
    using robust lexical parsing.
    """
    def __init__(self, raw_cursor, is_pg: bool = False):
        self._cursor = raw_cursor
        self._is_pg = is_pg

    def execute(self, sql: str, params: Optional[Any] = None):
        if self._is_pg:
            adapted_sql = adapt_sqlite_query_to_postgres(sql)
            if params is not None:
                return self._cursor.execute(adapted_sql, params)
            return self._cursor.execute(adapted_sql)
        else:
            if params is not None:
                return self._cursor.execute(sql, params)
            return self._cursor.execute(sql)

    def fetchone(self) -> Optional[Any]:
        return self._cursor.fetchone()

    def fetchall(self) -> List[Any]:
        return self._cursor.fetchall()

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def close(self):
        try:
            self._cursor.close()
        except Exception:
            pass


class DualConnection:
    """
    Connection wrapper providing uniform cursor creation and transaction controls.
    """
    def __init__(self, raw_conn, is_pg: bool = False):
        self._conn = raw_conn
        self._is_pg = is_pg

    def cursor(self) -> DualCursor:
        if self._is_pg:
            import psycopg2.extras
            return DualCursor(
                self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor),
                is_pg=True
            )
        return DualCursor(self._conn.cursor(), is_pg=False)

    def execute(self, sql: str, params: Optional[Any] = None) -> DualCursor:
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass


@contextmanager
def get_connection():
    """
    Context manager providing a database connection with:
    - PostgreSQL connection when DATABASE_URL is set (Supabase free tier)
    - SQLite connection when DATABASE_URL is absent (local development)
    - Row dictionary access across both engines
    - Automatic commit on exit, rollback on exception
    """
    if is_postgres():
        try:
            import psycopg2
            import psycopg2.extras
        except ImportError:
            raise RuntimeError(
                "psycopg2 is required when DATABASE_URL is set to a PostgreSQL connection. "
                "Please install psycopg2-binary: pip install psycopg2-binary"
            )
        db_url = get_database_url()
        connect_kwargs: Dict[str, Any] = {}
        # Enforce SSL for cloud PostgreSQL (Supabase requirement)
        if "sslmode=" not in db_url.lower():
            connect_kwargs["sslmode"] = "require"

        conn = psycopg2.connect(db_url, **connect_kwargs)
        wrapped_conn = DualConnection(conn, is_pg=True)
        try:
            yield wrapped_conn
            wrapped_conn.commit()
        except Exception:
            wrapped_conn.rollback()
            raise
        finally:
            wrapped_conn.close()
    else:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        # Enforce SQLite foreign keys and WAL mode
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        wrapped_conn = DualConnection(conn, is_pg=False)
        try:
            yield wrapped_conn
            wrapped_conn.commit()
        except Exception:
            wrapped_conn.rollback()
            raise
        finally:
            wrapped_conn.close()


# -----------------------------------------------------------------------------
# Schema Migrations (SQLite & PostgreSQL Compatible)
# -----------------------------------------------------------------------------

SQLITE_MIGRATIONS: List[Tuple[int, str, List[str]]] = [
    (
        1,
        "initial_auth_and_persistence_schema",
        [
            # 1. Users table
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",

            # 2. Sessions table (storing SHA-256 hash of session token)
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                token_hash TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ip_address TEXT,
                user_agent TEXT,
                expires_at REAL NOT NULL,
                created_at TEXT NOT NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);",

            # 3. Password reset tokens table (storing SHA-256 hash of reset token)
            """
            CREATE TABLE IF NOT EXISTS password_resets (
                id TEXT PRIMARY KEY,
                token_hash TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at REAL NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);",
            "CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);",

            # 4. User Profiles table
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);",

            # 5. Profile Audits table (historical audit results)
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_profile_audits_user_id ON profile_audits(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_profile_audits_created_at ON profile_audits(created_at);",

            # 6. Post Drafts table
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_post_drafts_user_id ON post_drafts(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_post_drafts_updated_at ON post_drafts(updated_at);",

            # 7. LinkedIn Connections table (user-specific tokens, encrypted)
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_linkedin_connections_user_id ON linkedin_connections(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_linkedin_connections_member_urn ON linkedin_connections(member_urn);"
        ]
    )
]

PG_MIGRATIONS: List[Tuple[int, str, List[str]]] = [
    (
        1,
        "initial_auth_and_persistence_schema",
        [
            # 1. Users table
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));",

            # 2. Sessions table
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                token_hash TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ip_address TEXT,
                user_agent TEXT,
                expires_at DOUBLE PRECISION NOT NULL,
                created_at TEXT NOT NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);",

            # 3. Password reset tokens table
            """
            CREATE TABLE IF NOT EXISTS password_resets (
                id TEXT PRIMARY KEY,
                token_hash TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at DOUBLE PRECISION NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);",
            "CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);",

            # 4. User Profiles table
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);",

            # 5. Profile Audits table
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_profile_audits_user_id ON profile_audits(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_profile_audits_created_at ON profile_audits(created_at);",

            # 6. Post Drafts table
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_post_drafts_user_id ON post_drafts(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_post_drafts_updated_at ON post_drafts(updated_at);",

            # 7. LinkedIn Connections table
            """
            CREATE TABLE IF NOT EXISTS linkedin_connections (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                member_urn TEXT NOT NULL,
                member_name TEXT NOT NULL,
                member_email TEXT,
                member_picture TEXT,
                profile_url TEXT,
                encrypted_access_token TEXT NOT NULL,
                token_expires_at DOUBLE PRECISION NOT NULL,
                connected_at TEXT NOT NULL,
                scopes TEXT NOT NULL DEFAULT '[]'
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_linkedin_connections_user_id ON linkedin_connections(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_linkedin_connections_member_urn ON linkedin_connections(member_urn);"
        ]
    )
]

# Aliased for backward compatibility with existing tests
MIGRATIONS = SQLITE_MIGRATIONS


def init_db():
    """
    Initializes the database and applies all pending migrations.
    Guarantees idempotency and safe rerun across SQLite and PostgreSQL.
    """
    migrations_to_apply = PG_MIGRATIONS if is_postgres() else SQLITE_MIGRATIONS
    engine_name = "PostgreSQL" if is_postgres() else "SQLite"

    with get_connection() as conn:
        cursor = conn.cursor()
        # Create migrations tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );
        """)

        # Fetch already applied migration versions
        cursor.execute("SELECT version FROM schema_migrations ORDER BY version ASC;")
        rows = cursor.fetchall()
        applied_versions = {r["version"] if isinstance(r, (dict, Mapping)) or hasattr(r, "keys") else r[0] for r in rows}

        for version, name, statements in migrations_to_apply:
            if version not in applied_versions:
                for stmt in statements:
                    cursor.execute(stmt)
                cursor.execute(
                    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                    (version, name, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
                )
                print(f"[Database:{engine_name}] Applied migration {version}: {name}")


# -----------------------------------------------------------------------------
# User CRUD
# -----------------------------------------------------------------------------

def create_user(name: str, email: str, password_hash: str) -> Dict[str, Any]:
    """Creates a new user record. Returns user dict without password hash."""
    user_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            (user_id, name.strip(), email.strip().lower(), password_hash, now, now)
        )
    return {
        "id": user_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "createdAt": now,
        "updatedAt": now
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves user by email (case-insensitive). Includes password_hash for auth verification."""
    clean_email = email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?;",
            (clean_email,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"]
        }


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves safe user dict by ID (excludes password_hash)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?;",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"]
        }


def update_user_password(user_id: str, new_password_hash: str) -> bool:
    """Updates a user's password hash and updated_at timestamp."""
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;",
            (new_password_hash, now, user_id)
        )
        return cursor.rowcount > 0


# -----------------------------------------------------------------------------
# Sessions CRUD (stores token_hash)
# -----------------------------------------------------------------------------

def create_session(token_hash: str, user_id: str, expires_at: float, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> str:
    """Inserts a new active session using hashed token."""
    session_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (id, token_hash, user_id, ip_address, user_agent, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (session_id, token_hash, user_id, ip_address, user_agent, expires_at, now)
        )
    return session_id


def get_session_user(token_hash: str) -> Optional[Dict[str, Any]]:
    """
    Validates a session token hash.
    Returns user dict if valid and unexpired; automatically prunes if expired.
    """
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.id AS session_id, s.expires_at, u.id AS user_id, u.name, u.email, u.created_at, u.updated_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token_hash = ?;
            """,
            (token_hash,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        if row["expires_at"] < now:
            # Session expired: clean up
            cursor.execute("DELETE FROM sessions WHERE id = ?;", (row["session_id"],))
            return None
        return {
            "sessionId": row["session_id"],
            "id": row["user_id"],
            "name": row["name"],
            "email": row["email"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"]
        }


def delete_session(token_hash: str) -> bool:
    """Invalidates an active session token upon logout."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token_hash = ?;", (token_hash,))
        return cursor.rowcount > 0


def delete_user_sessions(user_id: str) -> int:
    """Invalidates all sessions for a user (e.g. after password change/reset)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE user_id = ?;", (user_id,))
        return cursor.rowcount


def cleanup_expired_sessions() -> int:
    """Removes all expired sessions from the database."""
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE expires_at < ?;", (now,))
        return cursor.rowcount


# -----------------------------------------------------------------------------
# Password Resets CRUD
# -----------------------------------------------------------------------------

def create_password_reset(token_hash: str, user_id: str, expires_at: float) -> str:
    """Creates a single-use password reset record."""
    reset_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO password_resets (id, token_hash, user_id, expires_at, used, created_at)
            VALUES (?, ?, ?, ?, 0, ?);
            """,
            (reset_id, token_hash, user_id, expires_at, now)
        )
    return reset_id


def get_password_reset(token_hash: str) -> Optional[Dict[str, Any]]:
    """Retrieves an unused and unexpired password reset token record."""
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, user_id, expires_at, used, created_at
            FROM password_resets
            WHERE token_hash = ? AND used = 0 AND expires_at >= ?;
            """,
            (token_hash, now)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "userId": row["user_id"],
            "expiresAt": row["expires_at"],
            "createdAt": row["created_at"]
        }


def mark_password_reset_used(token_hash: str) -> bool:
    """Marks a password reset token as consumed."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE password_resets SET used = 1 WHERE token_hash = ?;",
            (token_hash,)
        )
        return cursor.rowcount > 0


# -----------------------------------------------------------------------------
# User Profile CRUD
# -----------------------------------------------------------------------------

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves user profile by user_id."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, user_id, profile_source, headline, about, skills,
                   education, experience, projects, target_role,
                   experience_status, career_intent, profile_url, updated_at
            FROM user_profiles
            WHERE user_id = ?;
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "userId": row["user_id"],
            "profileSource": row["profile_source"],
            "headline": row["headline"],
            "about": row["about"],
            "skills": json.loads(row["skills"]) if row["skills"] else [],
            "education": row["education"],
            "experience": json.loads(row["experience"]) if row["experience"] else [],
            "projects": row["projects"],
            "targetRole": row["target_role"],
            "experienceStatus": row["experience_status"],
            "careerIntent": row["career_intent"],
            "profileUrl": row["profile_url"],
            "updatedAt": row["updated_at"]
        }


def upsert_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Upserts user profile data safely with cross-engine conflict handling."""
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    skills_json = json.dumps(data.get("skills", []))
    experience_json = json.dumps(data.get("experience", []))
    profile_id = str(uuid.uuid4())

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_profiles (
                id, user_id, profile_source, headline, about, skills, education,
                experience, projects, target_role, experience_status, career_intent,
                profile_url, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                profile_source = excluded.profile_source,
                headline = excluded.headline,
                about = excluded.about,
                skills = excluded.skills,
                education = excluded.education,
                experience = excluded.experience,
                projects = excluded.projects,
                target_role = excluded.target_role,
                experience_status = excluded.experience_status,
                career_intent = excluded.career_intent,
                profile_url = excluded.profile_url,
                updated_at = excluded.updated_at;
            """,
            (
                profile_id,
                user_id,
                data.get("profileSource", "manual"),
                data.get("headline", ""),
                data.get("about", ""),
                skills_json,
                data.get("education", ""),
                experience_json,
                data.get("projects", ""),
                data.get("targetRole", "Full-Stack Engineer"),
                data.get("experienceStatus", "fresher"),
                data.get("careerIntent", "current-field"),
                data.get("profileUrl", ""),
                now
            )
        )
    return get_user_profile(user_id) or {}


# -----------------------------------------------------------------------------
# Profile Audits CRUD
# -----------------------------------------------------------------------------

def save_profile_audit(user_id: str, audit_data: Dict[str, Any]) -> Dict[str, Any]:
    """Saves a completed profile audit to history."""
    audit_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    category_scores_json = json.dumps(audit_data.get("categories", {}))
    improvements_json = json.dumps(audit_data.get("improvements", {}))
    keyword_insights_json = json.dumps(audit_data.get("keywordInsights", {}))

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO profile_audits (
                id, user_id, target_role, career_intent, overall_score,
                overall_rating, engine_used, summary, category_scores,
                improvements, keyword_insights, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                audit_id,
                user_id,
                audit_data.get("targetRole", "General"),
                audit_data.get("careerIntent", "current-field"),
                int(audit_data.get("overallScore", 0)),
                audit_data.get("overallRating", "Fair"),
                audit_data.get("engineUsed", "Heuristic Analyzer"),
                audit_data.get("summary", ""),
                category_scores_json,
                improvements_json,
                keyword_insights_json,
                now
            )
        )

    return {
        "id": audit_id,
        "userId": user_id,
        "overallScore": audit_data.get("overallScore", 0),
        "overallRating": audit_data.get("overallRating", "Fair"),
        "targetRole": audit_data.get("targetRole", "General"),
        "careerIntent": audit_data.get("careerIntent", "current-field"),
        "engineUsed": audit_data.get("engineUsed", "Heuristic Analyzer"),
        "createdAt": now
    }


def get_user_audits(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieves recent profile audits for a user."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, user_id, target_role, career_intent, overall_score,
                   overall_rating, engine_used, summary, category_scores,
                   improvements, keyword_insights, created_at
            FROM profile_audits
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?;
            """,
            (user_id, limit)
        )
        rows = cursor.fetchall()
        audits = []
        for r in rows:
            audits.append({
                "id": r["id"],
                "userId": r["user_id"],
                "targetRole": r["target_role"],
                "careerIntent": r["career_intent"],
                "overallScore": r["overall_score"],
                "overallRating": r["overall_rating"],
                "engineUsed": r["engine_used"],
                "summary": r["summary"],
                "categoryScores": json.loads(r["category_scores"]) if r["category_scores"] else {},
                "improvements": json.loads(r["improvements"]) if r["improvements"] else {},
                "keywordInsights": json.loads(r["keyword_insights"]) if r["keyword_insights"] else {},
                "createdAt": r["created_at"]
            })
        return audits


# -----------------------------------------------------------------------------
# Post Drafts CRUD
# -----------------------------------------------------------------------------

def save_post_draft(user_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
    """Creates or updates a post draft."""
    draft_id = draft_data.get("id") or str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    alt_hooks_json = json.dumps(draft_data.get("alternativeHooks", []))
    hashtags_json = json.dumps(draft_data.get("hashtags", []))
    ai_metadata_json = json.dumps(draft_data.get("aiMetadata", {}))

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO post_drafts (
                id, user_id, content, hook, alternative_hooks, hashtags,
                visual_summary, ai_metadata, tone, length, image_url,
                status, published_at, linkedin_post_urn, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                content = excluded.content,
                hook = excluded.hook,
                alternative_hooks = excluded.alternative_hooks,
                hashtags = excluded.hashtags,
                visual_summary = excluded.visual_summary,
                ai_metadata = excluded.ai_metadata,
                tone = excluded.tone,
                length = excluded.length,
                image_url = excluded.image_url,
                status = excluded.status,
                published_at = excluded.published_at,
                linkedin_post_urn = excluded.linkedin_post_urn,
                updated_at = excluded.updated_at
            WHERE post_drafts.user_id = excluded.user_id;
            """,
            (
                draft_id,
                user_id,
                draft_data.get("content", ""),
                draft_data.get("hook", ""),
                alt_hooks_json,
                hashtags_json,
                draft_data.get("visualSummary", ""),
                ai_metadata_json,
                draft_data.get("tone", "professional"),
                draft_data.get("length", "medium"),
                draft_data.get("imageUrl"),
                draft_data.get("status", "Draft"),
                draft_data.get("publishedAt"),
                draft_data.get("linkedinPostUrn"),
                draft_data.get("createdAt", now),
                now
            )
        )

    return get_post_draft(draft_id, user_id) or {}


def get_post_draft(draft_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single draft ensuring user ownership."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, user_id, content, hook, alternative_hooks, hashtags,
                   visual_summary, ai_metadata, tone, length, image_url,
                   status, published_at, linkedin_post_urn, created_at, updated_at
            FROM post_drafts
            WHERE id = ? AND user_id = ?;
            """,
            (draft_id, user_id)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return _format_draft_row(row)


def get_user_drafts(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all drafts belonging to user."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, user_id, content, hook, alternative_hooks, hashtags,
                   visual_summary, ai_metadata, tone, length, image_url,
                   status, published_at, linkedin_post_urn, created_at, updated_at
            FROM post_drafts
            WHERE user_id = ?
            ORDER BY updated_at DESC;
            """,
            (user_id,)
        )
        return [_format_draft_row(row) for row in cursor.fetchall()]


def delete_post_draft(draft_id: str, user_id: str) -> bool:
    """Deletes a draft enforcing ownership check."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM post_drafts WHERE id = ? AND user_id = ?;",
            (draft_id, user_id)
        )
        return cursor.rowcount > 0


def _format_draft_row(row: Any) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "content": row["content"],
        "hook": row["hook"],
        "alternativeHooks": json.loads(row["alternative_hooks"]) if row["alternative_hooks"] else [],
        "hashtags": json.loads(row["hashtags"]) if row["hashtags"] else [],
        "visualSummary": row["visual_summary"],
        "aiMetadata": json.loads(row["ai_metadata"]) if row["ai_metadata"] else {},
        "tone": row["tone"],
        "length": row["length"],
        "imageUrl": row["image_url"],
        "status": row["status"],
        "publishedAt": row["published_at"],
        "linkedinPostUrn": row["linkedin_post_urn"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }


# -----------------------------------------------------------------------------
# LinkedIn Connections CRUD
# -----------------------------------------------------------------------------

def upsert_linkedin_connection(
    user_id: str,
    member_urn: str,
    member_name: str,
    member_email: Optional[str],
    member_picture: Optional[str],
    profile_url: Optional[str],
    encrypted_token: str,
    expires_at: float,
    scopes: List[str]
) -> Dict[str, Any]:
    """Persists encrypted LinkedIn connection associated with user_id."""
    conn_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    scopes_json = json.dumps(scopes)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO linkedin_connections (
                id, user_id, member_urn, member_name, member_email, member_picture,
                profile_url, encrypted_access_token, token_expires_at, connected_at, scopes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                member_urn = excluded.member_urn,
                member_name = excluded.member_name,
                member_email = excluded.member_email,
                member_picture = excluded.member_picture,
                profile_url = excluded.profile_url,
                encrypted_access_token = excluded.encrypted_access_token,
                token_expires_at = excluded.token_expires_at,
                connected_at = excluded.connected_at,
                scopes = excluded.scopes;
            """,
            (
                conn_id, user_id, member_urn, member_name, member_email, member_picture,
                profile_url, encrypted_token, expires_at, now, scopes_json
            )
        )
    return get_linkedin_connection(user_id) or {}


def get_linkedin_connection(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves LinkedIn connection info for user. Excludes raw token; gives encrypted token."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, user_id, member_urn, member_name, member_email, member_picture,
                   profile_url, encrypted_access_token, token_expires_at, connected_at, scopes
            FROM linkedin_connections
            WHERE user_id = ?;
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "userId": row["user_id"],
            "memberUrn": row["member_urn"],
            "memberName": row["member_name"],
            "memberEmail": row["member_email"],
            "memberPicture": row["member_picture"],
            "profileUrl": row["profile_url"],
            "encryptedAccessToken": row["encrypted_access_token"],
            "tokenExpiresAt": row["token_expires_at"],
            "connectedAt": row["connected_at"],
            "scopes": json.loads(row["scopes"]) if row["scopes"] else []
        }


def delete_linkedin_connection(user_id: str) -> bool:
    """Removes a user's LinkedIn connection upon disconnect."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM linkedin_connections WHERE user_id = ?;", (user_id,))
        return cursor.rowcount > 0

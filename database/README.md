# LinkedPulse — Database Architecture & Migrations

LinkedPulse features a dual-engine persistent database layer supporting both SQLite (for zero-configuration local development) and PostgreSQL (for Supabase production deployment).

## Structure
- `migrations/`: Contains raw SQL schema definitions for versioned releases.
  - `001_initial_schema_postgresql.sql`: PostgreSQL DDL for Supabase Free tier.
  - `001_initial_schema_sqlite.sql`: SQLite DDL for local development.
- `scripts/`: Operational database scripts.
  - `migrate_sqlite_to_postgres.py`: Utility to dump records from SQLite and load them idempotently (`ON CONFLICT DO NOTHING`) into PostgreSQL.
  - `supabase_backup.py`: Disaster-recovery CLI utility for manual dumps (`pg_dump` or `supabase db dump`) and restores on the Supabase Free tier.

## Dual-Engine Mechanics
- If `DATABASE_URL` is set, `database.py` activates PostgreSQL via `psycopg2-binary`.
- If `DATABASE_URL` is absent, `database.py` connects to local `linkedpulse.db` via standard library `sqlite3`.
- Parameter placeholders are adapted transparently (`?` for SQLite, `%s` for PostgreSQL) using a lexical parser that preserves string literals, comments, and JSON operators.

## Automated Schema Migrations
On application startup, `server.py` invokes `database.init_db()`.
Migrations are tracked in the `schema_migrations` table to guarantee safe, idempotent reruns across restarts.

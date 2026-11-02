#!/usr/bin/env python3
"""
migrate_sqlite_to_postgres.py
=============================
Zero-Cost SQLite to Supabase PostgreSQL Migration Utility for LinkedPulse.

Features:
- Migrates all LinkedPulse tables: users, sessions, password_resets,
  user_profiles, profile_audits, post_drafts, linkedin_connections, schema_migrations.
- Fully idempotent: Uses ON CONFLICT DO NOTHING so reruns are safe without duplicate key errors.
- Dry-run mode (--dry-run) to preview counts without writing to PostgreSQL.
- Verifies record count integrity post-migration.
- Secure: Never logs passwords or sensitive tokens.

Usage:
    # Run migration using environment DATABASE_URL
    python migrate_sqlite_to_postgres.py

    # Run with explicit database URL
    python migrate_sqlite_to_postgres.py --database-url "postgresql://postgres:password@db.supabase.co:5432/postgres?sslmode=require"

    # Dry run preview
    python migrate_sqlite_to_postgres.py --dry-run
"""

import os
import sys
import argparse
import sqlite3
import json
from typing import Dict, Any, List, Tuple

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database


TABLES_IN_ORDER = [
    "schema_migrations",
    "users",
    "sessions",
    "password_resets",
    "user_profiles",
    "profile_audits",
    "post_drafts",
    "linkedin_connections",
]

# Primary conflict columns per table
TABLE_CONFLICT_KEYS = {
    "schema_migrations": "version",
    "users": "id",
    "sessions": "id",
    "password_resets": "id",
    "user_profiles": "id",
    "profile_audits": "id",
    "post_drafts": "id",
    "linkedin_connections": "id",
}


def dump_sqlite_table(sqlite_conn: sqlite3.Connection, table_name: str) -> Tuple[List[str], List[Tuple]]:
    """Dumps all rows from a SQLite table with column names."""
    cursor = sqlite_conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name};")
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return columns, rows


def migrate(sqlite_path: str, pg_url: str, dry_run: bool = False) -> Dict[str, Any]:
    """Performs end-to-end migration from SQLite to PostgreSQL."""
    if not os.path.isfile(sqlite_path):
        raise FileNotFoundError(f"SQLite database file not found at: {sqlite_path}")

    # Import psycopg2 for live PostgreSQL connectivity
    pg_conn = None
    if not dry_run:
        try:
            import psycopg2
            import psycopg2.extras
        except ImportError:
            raise RuntimeError(
                "psycopg2 is required for PostgreSQL migration. "
                "Please install: pip install psycopg2-binary"
            )

    # Normalize PostgreSQL URL
    if pg_url.startswith("postgres://"):
        pg_url = "postgresql://" + pg_url[len("postgres://"):]

    print("=" * 60)
    print("LinkedPulse SQLite -> Supabase PostgreSQL Migration")
    print("=" * 60)
    print(f"Source SQLite DB : {sqlite_path}")
    print(f"Target Database  : {pg_url.split('@')[-1] if '@' in pg_url else '[REDACTED]'}")
    print(f"Mode             : {'DRY RUN (Preview Only)' if dry_run else 'LIVE MIGRATION'}")
    print("=" * 60)

    # 1. Inspect source SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    # 2. Connect to PostgreSQL and ensure tables exist
    connect_kwargs = {}
    if "sslmode=" not in pg_url.lower():
        connect_kwargs["sslmode"] = "require"

    if not dry_run:
        pg_conn = psycopg2.connect(pg_url, **connect_kwargs)
        # Apply PostgreSQL schema migrations
        with pg_conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at TEXT NOT NULL
                );
            """)
            for version, name, statements in database.PG_MIGRATIONS:
                for stmt in statements:
                    cur.execute(stmt)
            pg_conn.commit()
            print("[PostgreSQL] Target schema initialized and verified.")
    else:
        pg_conn = None

    results = {}

    for table in TABLES_IN_ORDER:
        try:
            columns, rows = dump_sqlite_table(sqlite_conn, table)
        except sqlite3.OperationalError:
            print(f"[-] Table '{table}' not present in source SQLite. Skipping.")
            continue

        row_count = len(rows)
        results[table] = {
            "source_count": row_count,
            "migrated_count": 0,
            "target_count": 0
        }

        print(f"\n[*] Table: {table} ({row_count} rows in SQLite)")

        if row_count == 0:
            print(f"    0 rows to migrate.")
            continue

        if dry_run:
            print(f"    [DRY RUN] Would insert {row_count} rows with columns: {', '.join(columns)}")
            results[table]["migrated_count"] = row_count
            continue

        # Build parameterized PostgreSQL insert query
        cols_str = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        conflict_col = TABLE_CONFLICT_KEYS.get(table, "id")
        insert_sql = f"""
            INSERT INTO {table} ({cols_str})
            VALUES ({placeholders})
            ON CONFLICT ({conflict_col}) DO NOTHING;
        """

        try:
            with pg_conn.cursor() as pg_cur:
                inserted = 0
                for row in rows:
                    pg_cur.execute(insert_sql, tuple(row))
                    inserted += pg_cur.rowcount
                pg_conn.commit()

                # Verify target count
                pg_cur.execute(f"SELECT COUNT(*) FROM {table};")
                target_count = pg_cur.fetchone()[0]

                results[table]["migrated_count"] = inserted
                results[table]["target_count"] = target_count

                print(f"    [SUCCESS] Inserted/Verified {inserted} rows. Target total: {target_count}")
        except Exception as e:
            if pg_conn:
                pg_conn.rollback()
            print(f"    [ERROR] Failed to migrate table '{table}': {e}. Rolled back transaction.")
            raise

    sqlite_conn.close()
    if pg_conn:
        pg_conn.close()

    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"{'Table Name':<25} {'Source':<10} {'Migrated':<10} {'Target Total':<12}")
    print("-" * 60)
    for tbl, data in results.items():
        print(f"{tbl:<25} {data['source_count']:<10} {data['migrated_count']:<10} {data['target_count']:<12}")
    print("=" * 60)
    print("Migration finished safely.")
    return results


def main():
    parser = argparse.ArgumentParser(description="LinkedPulse SQLite to Supabase PostgreSQL Migration")
    parser.add_argument(
        "--sqlite-path",
        default=database.DEFAULT_DB_FILE,
        help="Path to source SQLite database file (default: linkedin-optimizer/linkedpulse.db)"
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", ""),
        help="Target PostgreSQL connection URL (or read from DATABASE_URL env var)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration without modifying target PostgreSQL database"
    )

    args = parser.parse_args()

    if not args.dry_run and not args.database_url:
        print("[ERROR] DATABASE_URL is required for live migration.")
        print("Provide via --database-url or export DATABASE_URL='postgresql://...'")
        print("For previewing rows, run with --dry-run.")
        sys.exit(1)

    try:
        migrate(args.sqlite_path, args.database_url, dry_run=args.dry_run)
    except Exception as e:
        print(f"\n[CRITICAL ERROR] Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

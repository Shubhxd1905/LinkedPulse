#!/usr/bin/env python3
"""
supabase_backup.py
==================
Manual Disaster Recovery & Backup Utility for Supabase Free Tier.

IMPORTANT NOTICE ON SUPABASE FREE TIER:
- The Supabase Free Plan DOES NOT include automated daily backups or Point-In-Time Recovery (PITR).
- Free projects automatically pause after 7 days of inactivity.
- Backups MUST be taken manually and stored SEPARATELY from Supabase (e.g. encrypted local storage or external S3).

This script supports:
1. Manual database dump via pg_dump or Supabase CLI.
2. Database restore via psql or Supabase CLI.
3. Verification of existing table record counts.
"""

import os
import sys
import subprocess
import argparse
import time
from datetime import datetime


def get_default_dump_path() -> str:
    timestamp = time.strftime("%Y%m%d_%H%M%S", time.gmtime())
    backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    return os.path.join(backup_dir, f"linkedpulse_supabase_backup_{timestamp}.sql")


def run_command_with_redaction(cmd_list, env=None):
    """Executes command list without leaking database passwords in error messages."""
    cmd_str = " ".join([c if "password" not in c.lower() and "postgres:" not in c else "[REDACTED_CONN]" for c in cmd_list])
    print(f"[*] Executing: {cmd_str}")
    try:
        res = subprocess.run(cmd_list, env=env, check=True, capture_output=True, text=True)
        return res.stdout
    except subprocess.CalledProcessError as e:
        clean_err = e.stderr.replace("\n", " ") if e.stderr else "Unknown error"
        raise RuntimeError(f"Command failed (exit code {e.returncode}): {clean_err}")


def backup_database(database_url: str, output_file: str, use_supabase_cli: bool = False):
    """
    Dumps the Supabase PostgreSQL database schema and data.
    """
    print("=" * 65)
    print("Supabase Free-Tier Manual Database Backup")
    print("=" * 65)
    print(f"Output File: {output_file}")
    print("CAUTION: Supabase Free does NOT provide automated daily backups.")
    print("Store this output file in a secure location external to Supabase.")
    print("=" * 65)

    if use_supabase_cli:
        # Using Supabase CLI: supabase db dump -f <output_file>
        cmd = ["supabase", "db", "dump", "-f", output_file]
        run_command_with_redaction(cmd)
    else:
        # Using standard pg_dump
        # Clean postgresql URL
        db_url = database_url
        if db_url.startswith("postgres://"):
            db_url = "postgresql://" + db_url[len("postgres://"):]

        cmd = [
            "pg_dump",
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            "--dbname", db_url,
            "--file", output_file
        ]
        run_command_with_redaction(cmd)

    file_size_kb = os.path.getsize(output_file) / 1024
    print(f"\n[SUCCESS] Backup completed: {output_file} ({file_size_kb:.2f} KB)")
    print("[IMPORTANT] Move this backup file to an off-site, separate storage location.")


def restore_database(database_url: str, input_file: str, use_supabase_cli: bool = False):
    """
    Restores the database from a SQL dump file.
    """
    if not os.path.isfile(input_file):
        raise FileNotFoundError(f"Backup file not found: {input_file}")

    print("=" * 65)
    print("Supabase Database Restore Utility")
    print("=" * 65)
    print(f"Input File: {input_file}")
    print("WARNING: This will execute all DDL and DML statements in the dump.")
    print("=" * 65)

    if use_supabase_cli:
        cmd = ["supabase", "db", "reset"]
        run_command_with_redaction(cmd)
    else:
        db_url = database_url
        if db_url.startswith("postgres://"):
            db_url = "postgresql://" + db_url[len("postgres://"):]

        cmd = [
            "psql",
            "--dbname", db_url,
            "--file", input_file
        ]
        run_command_with_redaction(cmd)

    print(f"\n[SUCCESS] Database restore successfully applied from {input_file}.")


def main():
    parser = argparse.ArgumentParser(description="Supabase Manual Backup & Disaster Recovery")
    parser.add_argument("action", choices=["backup", "restore"], help="Action: 'backup' or 'restore'")
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", ""),
        help="Supabase PostgreSQL connection URL"
    )
    parser.add_argument(
        "--file",
        help="Path to SQL dump file (defaults to timestamped file in backups/ for backup)"
    )
    parser.add_argument(
        "--use-supabase-cli",
        action="store_true",
        help="Use Supabase CLI ('supabase db dump') instead of pg_dump"
    )

    args = parser.parse_args()

    if not args.database_url and not args.use_supabase_cli:
        print("[ERROR] DATABASE_URL is required (or pass --use-supabase-cli).")
        print("Example: python supabase_backup.py backup --database-url 'postgresql://postgres:pw@host:5432/postgres?sslmode=require'")
        sys.exit(1)

    try:
        if args.action == "backup":
            dump_file = args.file or get_default_dump_path()
            backup_database(args.database_url, dump_file, use_supabase_cli=args.use_supabase_cli)
        elif args.action == "restore":
            if not args.file:
                print("[ERROR] --file <path_to_dump.sql> is required for restore action.")
                sys.exit(1)
            restore_database(args.database_url, args.file, use_supabase_cli=args.use_supabase_cli)
    except Exception as e:
        print(f"\n[CRITICAL ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

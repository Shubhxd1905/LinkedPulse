"""
test_free_hosting_prep.py
=========================
Comprehensive test suite verifying LinkedPulse Free-Tier Hosting (₹0) components:
- SQLite and PostgreSQL dual-engine adapters
- Parameter marker adaptation (? -> %s)
- Schema migration parity
- Same-origin static asset and SPA fallback serving
- Email service error handling
- Migration script dry-run verification
"""

import os
import sys
import unittest
import tempfile
import sqlite3
import json
import urllib.request
import urllib.parse
from http.server import HTTPServer
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import server
import email_service
import migrate_sqlite_to_postgres
import supabase_backup


class TestDualEngineDatabase(unittest.TestCase):
    def setUp(self):
        self.orig_db_url = os.environ.get("DATABASE_URL")
        if "DATABASE_URL" in os.environ:
            del os.environ["DATABASE_URL"]

    def tearDown(self):
        if self.orig_db_url is not None:
            os.environ["DATABASE_URL"] = self.orig_db_url
        elif "DATABASE_URL" in os.environ:
            del os.environ["DATABASE_URL"]

    def test_is_postgres_detection(self):
        self.assertFalse(database.is_postgres())

        os.environ["DATABASE_URL"] = "postgresql://postgres:secret@db.supabase.co:5432/postgres?sslmode=require"
        self.assertTrue(database.is_postgres())

        os.environ["DATABASE_URL"] = "postgres://postgres:secret@db.supabase.co:5432/postgres"
        self.assertTrue(database.is_postgres())

    def test_get_database_url_normalization(self):
        os.environ["DATABASE_URL"] = "postgres://user:pass@host:5432/db"
        normalized = database.get_database_url()
        self.assertEqual(normalized, "postgresql://user:pass@host:5432/db")

        os.environ["DATABASE_URL"] = "postgresql://user:pass@host:5432/db"
        self.assertEqual(database.get_database_url(), "postgresql://user:pass@host:5432/db")

    def test_dual_cursor_parameter_adaptation(self):
        class MockRawCursor:
            def __init__(self):
                self.last_sql = None
                self.last_params = None
                self.rowcount = 1

            def execute(self, sql, params=None):
                self.last_sql = sql
                self.last_params = params

            def fetchone(self):
                return {"val": 1}

            def fetchall(self):
                return [{"val": 1}]

        # Test SQLite mode (no adaptation)
        mock_raw = MockRawCursor()
        cursor_sqlite = database.DualCursor(mock_raw, is_pg=False)
        cursor_sqlite.execute("SELECT * FROM users WHERE email = ? AND id = ?", ("test@example.com", "u1"))
        self.assertEqual(mock_raw.last_sql, "SELECT * FROM users WHERE email = ? AND id = ?")
        self.assertEqual(mock_raw.last_params, ("test@example.com", "u1"))

        # Test PostgreSQL mode (convert ? to %s)
        cursor_pg = database.DualCursor(mock_raw, is_pg=True)
        cursor_pg.execute("SELECT * FROM users WHERE email = ? AND id = ?", ("test@example.com", "u1"))
        self.assertEqual(mock_raw.last_sql, "SELECT * FROM users WHERE email = %s AND id = %s")
        self.assertEqual(mock_raw.last_params, ("test@example.com", "u1"))

    def test_lexical_parameter_adaptation_preserves_strings_and_operators(self):
        # 1. String literal with question mark
        sql1 = "SELECT * FROM posts WHERE title = 'Is this working?' AND user_id = ?;"
        adapted1 = database.adapt_sqlite_query_to_postgres(sql1)
        self.assertEqual(adapted1, "SELECT * FROM posts WHERE title = 'Is this working?' AND user_id = %s;")

        # 2. Escaped quotes inside strings
        sql2 = "SELECT * FROM posts WHERE title = 'It''s a question?' AND id = ?;"
        adapted2 = database.adapt_sqlite_query_to_postgres(sql2)
        self.assertEqual(adapted2, "SELECT * FROM posts WHERE title = 'It''s a question?' AND id = %s;")

        # 3. PostgreSQL JSON operators (?| and ?&)
        sql3 = "SELECT * FROM docs WHERE tags ?| array['a', 'b'] AND id = ?;"
        adapted3 = database.adapt_sqlite_query_to_postgres(sql3)
        self.assertEqual(adapted3, "SELECT * FROM docs WHERE tags ?| array['a', 'b'] AND id = %s;")

        # 4. Comments containing question marks
        sql4 = "SELECT * FROM t WHERE -- is this a comment? \n id = ?;"
        adapted4 = database.adapt_sqlite_query_to_postgres(sql4)
        self.assertEqual(adapted4, "SELECT * FROM t WHERE -- is this a comment? \n id = %s;")

    def test_sqlite_and_postgres_migration_parity(self):
        # Verify both migration lists define version 1
        self.assertEqual(len(database.SQLITE_MIGRATIONS), len(database.PG_MIGRATIONS))
        sqlite_v1 = database.SQLITE_MIGRATIONS[0]
        pg_v1 = database.PG_MIGRATIONS[0]

        self.assertEqual(sqlite_v1[0], pg_v1[0])  # version 1
        self.assertEqual(sqlite_v1[1], pg_v1[1])  # name

        # Expected tables in both migrations
        expected_tables = [
            "users",
            "sessions",
            "password_resets",
            "user_profiles",
            "profile_audits",
            "post_drafts",
            "linkedin_connections"
        ]
        for tbl in expected_tables:
            sqlite_has = any(f"CREATE TABLE IF NOT EXISTS {tbl}" in stmt for stmt in sqlite_v1[2])
            pg_has = any(f"CREATE TABLE IF NOT EXISTS {tbl}" in stmt for stmt in pg_v1[2])
            self.assertTrue(sqlite_has, f"SQLite missing table {tbl}")
            self.assertTrue(pg_has, f"PostgreSQL missing table {tbl}")


class TestSameOriginServerAndSPA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start server in background thread for testing
        cls.server_port = 8899
        cls.server_address = ("127.0.0.1", cls.server_port)
        cls.httpd = HTTPServer(cls.server_address, server.LinkedPulseHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_health_check_endpoint(self):
        url = f"http://127.0.0.1:{self.server_port}/health"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "healthy")
            self.assertEqual(data.get("database"), "connected")

    def test_unhandled_api_returns_404_json_not_html(self):
        url = f"http://127.0.0.1:{self.server_port}/api/nonexistent_test_route"
        req = urllib.request.Request(url)
        try:
            urllib.request.urlopen(req)
            self.fail("Expected HTTP 404")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 404)
            data = json.loads(e.read().decode("utf-8"))
            self.assertEqual(data.get("code"), "NOT_FOUND")

    def test_spa_route_fallback_serves_html(self):
        # When dist/ exists, visiting /dashboard or /optimize should serve index.html with 200 OK
        if os.path.isdir(server.STATIC_DIR) and os.path.isfile(os.path.join(server.STATIC_DIR, "index.html")):
            url = f"http://127.0.0.1:{self.server_port}/dashboard"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                self.assertEqual(resp.status, 200)
                content_type = resp.headers.get("Content-Type", "")
                self.assertIn("text/html", content_type)
                body = resp.read().decode("utf-8")
                self.assertIn("<html", body.lower())

    def test_missing_asset_with_extension_returns_404_not_html(self):
        if os.path.isdir(server.STATIC_DIR):
            url = f"http://127.0.0.1:{self.server_port}/assets/nonexistent_bundle_123.js"
            req = urllib.request.Request(url)
            try:
                urllib.request.urlopen(req)
                self.fail("Expected HTTP 404 for missing static asset file")
            except urllib.error.HTTPError as e:
                self.assertEqual(e.code, 404)
                body = e.read().decode("utf-8")
                self.assertIn("404 Not Found", body)

    def test_static_asset_serves_with_proper_mime(self):
        if os.path.isdir(server.STATIC_DIR) and os.path.isfile(os.path.join(server.STATIC_DIR, "favicon.svg")):
            url = f"http://127.0.0.1:{self.server_port}/favicon.svg"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                self.assertEqual(resp.status, 200)
                content_type = resp.headers.get("Content-Type", "")
                self.assertIn("image/svg+xml", content_type)


class TestEmailAndMigrationServices(unittest.TestCase):
    def test_email_service_unconfigured_behavior(self):
        orig_key = os.environ.get("RESEND_API_KEY")
        if "RESEND_API_KEY" in os.environ:
            del os.environ["RESEND_API_KEY"]

        success, err = email_service.send_password_reset_email("user@example.com", "fake_token_123")
        self.assertFalse(success)
        self.assertEqual(err, "EMAIL_SERVICE_NOT_CONFIGURED")

        if orig_key is not None:
            os.environ["RESEND_API_KEY"] = orig_key

    def test_migration_dry_run(self):
        # Create a temporary SQLite database with all tables
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
            temp_db = tf.name

        try:
            # Initialize temp db using SQLite migrations
            conn = sqlite3.connect(temp_db)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at TEXT NOT NULL
                );
            """)
            for _, _, stmts in database.SQLITE_MIGRATIONS:
                for s in stmts:
                    cur.execute(s)
            # Insert a sample user
            cur.execute(
                "INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);",
                ("u_test_1", "Test User", "test@linkedpulse.com", "fake_hash", "2026-11-01T00:00:00Z", "2026-11-01T00:00:00Z")
            )
            conn.commit()
            conn.close()

            # Execute dry run
            summary = migrate_sqlite_to_postgres.migrate(
                sqlite_path=temp_db,
                pg_url="postgresql://fake_user:fake_pass@fake_host:5432/fake_db",
                dry_run=True
            )
            self.assertIn("users", summary)
            self.assertEqual(summary["users"]["source_count"], 1)
            self.assertEqual(summary["users"]["migrated_count"], 1)
        finally:
            if os.path.isfile(temp_db):
                try:
                    os.remove(temp_db)
                except Exception:
                    pass

    def test_supabase_backup_module(self):
        dump_path = supabase_backup.get_default_dump_path()
        self.assertTrue(dump_path.endswith(".sql"))
        self.assertIn("linkedpulse_supabase_backup_", dump_path)


if __name__ == "__main__":
    unittest.main()

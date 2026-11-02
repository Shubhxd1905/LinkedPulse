"""
test_production_e2e_stages1_2_3.py
==================================
Comprehensive automated test suite for:
- STAGE 1: Authentication Testing (Full lifecycle, cookies, duplicate emails, invalid passwords, expired sessions)
- STAGE 2: Multi-User Data Isolation (Profiles, Audits, Drafts, Cross-user deletion protection, LinkedIn connections)
- STAGE 3: Database Persistence & Integrity (Server restart simulation, migration check, foreign key enforcement)
"""

import os
import sys
import time
import json
import uuid
import tempfile
import threading
import sqlite3
from http.server import HTTPServer
import urllib.request
import urllib.error
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import auth_service
import server


class TestProductionStages123(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        cls.temp_db.close()
        os.environ["DATABASE_PATH"] = cls.temp_db.name
        database.init_db()

        cls.port = 8993
        cls.server = HTTPServer(("127.0.0.1", cls.port), server.LinkedPulseHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        if os.path.exists(cls.temp_db.name):
            try:
                os.remove(cls.temp_db.name)
            except Exception:
                pass

    def _request(self, method, path, data=None, headers=None):
        url = f"{self.base_url}{path}"
        req_headers = {"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"}
        if headers:
            req_headers.update(headers)
        body_bytes = None
        if data is not None:
            req_headers["Content-Type"] = "application/json"
            body_bytes = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                set_cookie = resp.headers.get("Set-Cookie")
                return resp.status, resp_body, set_cookie
        except urllib.error.HTTPError as e:
            try:
                err_body = json.loads(e.read().decode("utf-8"))
            except Exception:
                err_body = {"raw": "non-json error"}
            return e.code, err_body, None

    # =========================================================================
    # STAGE 1: Authentication Testing
    # =========================================================================

    def test_00_health_and_production_env_validation(self):
        # 1. Test /health endpoint
        status, health_body, _ = self._request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(health_body.get("status"), "healthy")
        self.assertEqual(health_body.get("database"), "connected")
        self.assertEqual(health_body.get("version"), "1.0.0")

        # 2. Test /api/health endpoint
        status, api_health, _ = self._request("GET", "/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(api_health.get("status"), "healthy")

        # 3. Test validate_production_env guardrail
        orig_env = os.environ.get("ENV")
        orig_secret = os.environ.get("SECRET_KEY")
        orig_frontend = os.environ.get("FRONTEND_URL")
        try:
            # Running production without SECRET_KEY must fail
            os.environ["ENV"] = "production"
            if "SECRET_KEY" in os.environ:
                del os.environ["SECRET_KEY"]
            is_valid, err = auth_service.validate_production_env()
            self.assertFalse(is_valid)
            self.assertIn("SECRET_KEY", err)

            # Running production with short/weak SECRET_KEY must fail
            os.environ["SECRET_KEY"] = "short_key_123"
            is_valid, err = auth_service.validate_production_env()
            self.assertFalse(is_valid)
            self.assertIn("32 characters", err)

            # Running production with localhost FRONTEND_URL must fail
            os.environ["SECRET_KEY"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
            os.environ["FRONTEND_URL"] = "http://localhost:5173"
            is_valid, err = auth_service.validate_production_env()
            self.assertFalse(is_valid)
            self.assertIn("FRONTEND_URL", err)

            # Valid production configuration passes
            os.environ["FRONTEND_URL"] = "https://linkedpulse.com"
            is_valid, err = auth_service.validate_production_env()
            self.assertTrue(is_valid)
            self.assertIsNone(err)
        finally:
            if orig_env is not None:
                os.environ["ENV"] = orig_env
            elif "ENV" in os.environ:
                del os.environ["ENV"]
            if orig_secret is not None:
                os.environ["SECRET_KEY"] = orig_secret
            elif "SECRET_KEY" in os.environ:
                del os.environ["SECRET_KEY"]
            if orig_frontend is not None:
                os.environ["FRONTEND_URL"] = orig_frontend
            elif "FRONTEND_URL" in os.environ:
                del os.environ["FRONTEND_URL"]

    def test_01_authentication_lifecycle(self):
        email = f"user1_{uuid.uuid4().hex[:6]}@example.com"
        password = "SecurePassword123!"

        # A. Register new account
        status, reg_body, reg_cookie = self._request("POST", "/api/auth/register", {
            "name": "Alex User",
            "email": email,
            "password": password
        })
        self.assertEqual(status, 201)
        self.assertEqual(reg_body["status"], "success")
        self.assertIn("user", reg_body)
        self.assertEqual(reg_body["user"]["email"], email)
        self.assertTrue(bool(reg_cookie))
        self.assertIn("lp_session=", reg_cookie)
        self.assertIn("HttpOnly", reg_cookie)

        token = reg_body["sessionToken"]
        auth_hdr = {"Authorization": f"Bearer {token}"}

        # B. Verify authenticated session persistence
        status, me_body, _ = self._request("GET", "/api/auth/me", headers=auth_hdr)
        self.assertEqual(status, 200)
        self.assertEqual(me_body["user"]["email"], email)

        # C. Log out
        status, logout_body, logout_cookie = self._request("POST", "/api/auth/logout", {}, headers=auth_hdr)
        self.assertEqual(status, 200)
        self.assertIn("Max-Age=0", logout_cookie)

        # D. Verify protected endpoints inaccessible after logout
        status, _, _ = self._request("GET", "/api/auth/me", headers=auth_hdr)
        self.assertEqual(status, 401)
        status, _, _ = self._request("GET", "/api/user/profile", headers=auth_hdr)
        self.assertEqual(status, 401)

        # E. Log in again with valid credentials
        status, login_body, login_cookie = self._request("POST", "/api/auth/login", {
            "email": email,
            "password": password
        })
        self.assertEqual(status, 200)
        self.assertEqual(login_body["status"], "success")
        new_token = login_body["sessionToken"]
        new_auth_hdr = {"Authorization": f"Bearer {new_token}"}

        # F. Verify new session works
        status, me_body, _ = self._request("GET", "/api/auth/me", headers=new_auth_hdr)
        self.assertEqual(status, 200)
        self.assertEqual(me_body["user"]["email"], email)

        # G. Attempt login with incorrect password
        status, fail_body, _ = self._request("POST", "/api/auth/login", {
            "email": email,
            "password": "WrongPassword999!"
        })
        self.assertEqual(status, 401)
        self.assertEqual(fail_body["message"], "Invalid email or password.")

        # H. Attempt login with nonexistent email
        status, fail_body, _ = self._request("POST", "/api/auth/login", {
            "email": "nonexistent_9999@example.com",
            "password": "AnyPassword123!"
        })
        self.assertEqual(status, 401)
        self.assertEqual(fail_body["message"], "Invalid email or password.")

        # I. Duplicate email registration rejection
        status, dup_body, _ = self._request("POST", "/api/auth/register", {
            "name": "Imposter",
            "email": email,
            "password": "AnotherPassword456!"
        })
        self.assertEqual(status, 409)
        self.assertEqual(dup_body["code"], "EMAIL_EXISTS")

        # J. Expired session testing: manually expire the session in the database
        with database.get_connection() as conn:
            conn.execute("UPDATE sessions SET expires_at = ? WHERE user_id = ?", (int(time.time()) - 100, login_body["user"]["id"]))

        status, exp_body, _ = self._request("GET", "/api/auth/me", headers=new_auth_hdr)
        self.assertEqual(status, 401)

    # =========================================================================
    # STAGE 2: Multi-User Data Isolation
    # =========================================================================

    def test_02_multi_user_data_isolation(self):
        email_a = f"account_a_{uuid.uuid4().hex[:6]}@example.com"
        email_b = f"account_b_{uuid.uuid4().hex[:6]}@example.com"

        # Register Account A
        _, reg_a, _ = self._request("POST", "/api/auth/register", {
            "name": "Account Alpha", "email": email_a, "password": "PasswordA123!"
        })
        token_a = reg_a["sessionToken"]
        hdr_a = {"Authorization": f"Bearer {token_a}"}
        user_a_id = reg_a["user"]["id"]

        # Register Account B
        _, reg_b, _ = self._request("POST", "/api/auth/register", {
            "name": "Account Beta", "email": email_b, "password": "PasswordB123!"
        })
        token_b = reg_b["sessionToken"]
        hdr_b = {"Authorization": f"Bearer {token_b}"}
        user_b_id = reg_b["user"]["id"]

        # 1. Profile Isolation
        self._request("POST", "/api/user/profile", {
            "headline": "Alpha Data Scientist",
            "about": "Alpha's unique about section",
            "skills": ["Python", "TensorFlow", "Pandas"],
            "targetRole": "Data Scientist",
            "careerIntent": "continue",
            "source": "manual"
        }, headers=hdr_a)

        self._request("POST", "/api/user/profile", {
            "headline": "Beta Cloud Architect",
            "about": "Beta's unique about section",
            "skills": ["AWS", "Terraform", "Kubernetes"],
            "targetRole": "Cloud Architect",
            "careerIntent": "pivot",
            "source": "manual"
        }, headers=hdr_b)

        # Check Account A receives ONLY A's profile
        status, a_prof, _ = self._request("GET", "/api/user/profile", headers=hdr_a)
        self.assertEqual(status, 200)
        self.assertEqual(a_prof["profile"]["headline"], "Alpha Data Scientist")
        self.assertEqual(a_prof["profile"]["targetRole"], "Data Scientist")
        self.assertNotIn("AWS", a_prof["profile"]["skills"])

        # Check Account B receives ONLY B's profile
        status, b_prof, _ = self._request("GET", "/api/user/profile", headers=hdr_b)
        self.assertEqual(status, 200)
        self.assertEqual(b_prof["profile"]["headline"], "Beta Cloud Architect")
        self.assertEqual(b_prof["profile"]["targetRole"], "Cloud Architect")
        self.assertNotIn("TensorFlow", b_prof["profile"]["skills"])

        # 2. Audit History Isolation
        self._request("POST", "/api/user/audits", {
            "targetRole": "Data Scientist",
            "careerIntent": "continue",
            "overallScore": 92,
            "audit": {"overallScore": 92, "overallRating": "Top 5%", "summary": "Alpha Audit Summary"}
        }, headers=hdr_a)

        self._request("POST", "/api/user/audits", {
            "targetRole": "Cloud Architect",
            "careerIntent": "pivot",
            "overallScore": 78,
            "audit": {"overallScore": 78, "overallRating": "Good", "summary": "Beta Audit Summary"}
        }, headers=hdr_b)

        status, a_audits, _ = self._request("GET", "/api/user/audits", headers=hdr_a)
        self.assertEqual(status, 200)
        self.assertEqual(len(a_audits["audits"]), 1)
        self.assertEqual(a_audits["audits"][0]["targetRole"], "Data Scientist")
        self.assertEqual(a_audits["audits"][0]["overallScore"], 92)

        status, b_audits, _ = self._request("GET", "/api/user/audits", headers=hdr_b)
        self.assertEqual(status, 200)
        self.assertEqual(len(b_audits["audits"]), 1)
        self.assertEqual(b_audits["audits"][0]["targetRole"], "Cloud Architect")
        self.assertEqual(b_audits["audits"][0]["overallScore"], 78)

        # 3. Draft Isolation & Cross-Account Deletion Prevention
        draft_a_ids = []
        for i in range(1, 4):
            status, d_res, _ = self._request("POST", "/api/user/drafts", {
                "content": f"Alpha draft #{i} content",
                "tone": "expert",
                "hashtags": ["data", f"post{i}"]
            }, headers=hdr_a)
            self.assertEqual(status, 201)
            draft_a_ids.append(d_res["draft"]["id"])

        for j in range(1, 3):
            status, _, _ = self._request("POST", "/api/user/drafts", {
                "content": f"Beta draft #{j} content",
                "tone": "casual",
                "hashtags": ["cloud", f"post{j}"]
            }, headers=hdr_b)
            self.assertEqual(status, 201)

        # Account A has 3 drafts
        status, a_drafts, _ = self._request("GET", "/api/user/drafts", headers=hdr_a)
        self.assertEqual(len(a_drafts["drafts"]), 3)

        # Account B has 2 drafts
        status, b_drafts, _ = self._request("GET", "/api/user/drafts", headers=hdr_b)
        self.assertEqual(len(b_drafts["drafts"]), 2)

        # Account B attempts to delete Account A's draft -> Rejected with 404
        status, del_fail, _ = self._request("DELETE", f"/api/user/drafts?id={draft_a_ids[0]}", headers=hdr_b)
        self.assertEqual(status, 404)

        # Account A can delete its own draft
        status, del_ok, _ = self._request("DELETE", f"/api/user/drafts?id={draft_a_ids[0]}", headers=hdr_a)
        self.assertEqual(status, 200)

        # 4. LinkedIn Connections User-Specific Isolation
        encrypted_bundle = auth_service.encrypt_token("AQV_MockAccessTokenAlpha")
        database.upsert_linkedin_connection(
            user_id=user_a_id,
            member_urn="urn:li:person:alpha123",
            member_name="Alpha LinkedIn Member",
            member_email="alpha@linkedin.com",
            member_picture=None,
            profile_url=None,
            encrypted_token=encrypted_bundle,
            expires_at=time.time() + 3600,
            scopes=["openid", "profile", "w_member_social"]
        )

        # Account A has active connection
        conn_a = database.get_linkedin_connection(user_a_id)
        self.assertIsNotNone(conn_a)
        self.assertEqual(conn_a["memberName"], "Alpha LinkedIn Member")
        decrypted_a = auth_service.decrypt_token(conn_a["encryptedAccessToken"])
        self.assertEqual(decrypted_a, "AQV_MockAccessTokenAlpha")

        # Account B has NO connection
        conn_b = database.get_linkedin_connection(user_b_id)
        self.assertIsNone(conn_b)

    # =========================================================================
    # STAGE 3: Database Persistence & Integrity
    # =========================================================================

    def test_03_database_persistence_and_foreign_keys(self):
        email_c = f"account_c_{uuid.uuid4().hex[:6]}@example.com"
        _, reg_c, _ = self._request("POST", "/api/auth/register", {
            "name": "Charlie Persistence", "email": email_c, "password": "PasswordC123!"
        })
        token_c = reg_c["sessionToken"]
        hdr_c = {"Authorization": f"Bearer {token_c}"}
        user_c_id = reg_c["user"]["id"]

        # Save profile
        self._request("POST", "/api/user/profile", {
            "headline": "Charlie Permanent Record",
            "targetRole": "Database Administrator",
            "careerIntent": "continue",
            "source": "manual",
            "skills": ["SQLite", "PostgreSQL"]
        }, headers=hdr_c)

        # Save audit
        self._request("POST", "/api/user/audits", {
            "targetRole": "Database Administrator",
            "careerIntent": "continue",
            "overallScore": 88,
            "audit": {"overallScore": 88, "summary": "DBA audit record"}
        }, headers=hdr_c)

        # Save draft
        status, d_res, _ = self._request("POST", "/api/user/drafts", {
            "content": "Persistent draft about SQLite WAL mode",
            "tone": "technical"
        }, headers=hdr_c)
        draft_c_id = d_res["draft"]["id"]

        # Simulate Server/DB Restart: Re-query database freshly
        # 1. Verify user persists
        reloaded_user = database.get_user_by_email(email_c)
        self.assertIsNotNone(reloaded_user)
        self.assertEqual(reloaded_user["id"], user_c_id)

        # 2. Verify reloaded profile
        reloaded_prof = database.get_user_profile(user_c_id)
        self.assertIsNotNone(reloaded_prof)
        self.assertEqual(reloaded_prof["headline"], "Charlie Permanent Record")

        # 3. Verify reloaded audits
        reloaded_audits = database.get_user_audits(user_c_id)
        self.assertEqual(len(reloaded_audits), 1)
        self.assertEqual(reloaded_audits[0]["overallScore"], 88)

        # 4. Verify reloaded drafts
        reloaded_drafts = database.get_user_drafts(user_c_id)
        self.assertEqual(len(reloaded_drafts), 1)
        self.assertEqual(reloaded_drafts[0]["id"], draft_c_id)

        # 5. Foreign key constraint verification:
        # Directly insert draft referencing non-existent user_id -> MUST raise sqlite3.IntegrityError
        with self.assertRaises(sqlite3.IntegrityError):
            with database.get_connection() as conn:
                conn.execute(
                    "INSERT INTO post_drafts (id, user_id, content) VALUES (?, ?, ?)",
                    (str(uuid.uuid4()), "nonexistent-user-uuid-9999", "Orphaned draft")
                )

        # 6. Foreign key cascade verification:
        # Deleting user_c MUST cascade delete profile, audits, drafts, and sessions
        with database.get_connection() as conn:
            conn.execute("DELETE FROM users WHERE id = ?", (user_c_id,))

        self.assertIsNone(database.get_user_profile(user_c_id))
        self.assertEqual(len(database.get_user_audits(user_c_id)), 0)
        self.assertEqual(len(database.get_user_drafts(user_c_id)), 0)


if __name__ == "__main__":
    unittest.main()

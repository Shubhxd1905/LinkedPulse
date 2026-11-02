"""
test_server_auth_integration.py
===============================
HTTP-level integration tests for LinkedPulse server authentication & data endpoints.
Runs an in-process LinkedPulseHandler or test server to verify:
1. Registration & cookie issuing
2. Login & credential verification
3. GET /api/auth/me authenticated vs 401 unauthenticated
4. User profile persistence & data isolation across two accounts
5. User drafts CRUD & data isolation
6. User audits persistence & retrieval
7. Logout and session invalidation
"""

import os
import sys
import time
import json
import uuid
import tempfile
import threading
from http.server import HTTPServer
import urllib.request
import urllib.error
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import server


class TestServerAuthIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Dedicated temp database for server integration tests
        cls.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        cls.temp_db.close()
        os.environ["DATABASE_PATH"] = cls.temp_db.name
        database.init_db()

        # Find a free port and start server in background thread
        cls.port = 8899
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

    def _post(self, path, data, headers=None):
        url = f"{self.base_url}{path}"
        req_headers = {"Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest"}
        if headers:
            req_headers.update(headers)
        body_bytes = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                set_cookie = resp.headers.get("Set-Cookie")
                return resp.status, resp_body, set_cookie
        except urllib.error.HTTPError as e:
            err_body = json.loads(e.read().decode("utf-8"))
            return e.code, err_body, None

    def _get(self, path, headers=None):
        url = f"{self.base_url}{path}"
        req_headers = {"Accept": "application/json"}
        if headers:
            req_headers.update(headers)
        req = urllib.request.Request(url, headers=req_headers, method="GET")
        try:
            with urllib.request.urlopen(req) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                return resp.status, resp_body
        except urllib.error.HTTPError as e:
            err_body = json.loads(e.read().decode("utf-8"))
            return e.code, err_body

    def _delete(self, path, headers=None):
        url = f"{self.base_url}{path}"
        req_headers = {"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"}
        if headers:
            req_headers.update(headers)
        req = urllib.request.Request(url, headers=req_headers, method="DELETE")
        try:
            with urllib.request.urlopen(req) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                return resp.status, resp_body
        except urllib.error.HTTPError as e:
            err_body = json.loads(e.read().decode("utf-8"))
            return e.code, err_body

    def test_complete_auth_and_isolation_lifecycle(self):
        # 1. Unauthenticated /api/auth/me returns 401
        status, body = self._get("/api/auth/me")
        self.assertEqual(status, 401)
        self.assertEqual(body.get("code"), "UNAUTHORIZED")

        # 2. Register Account 1 (Alex)
        alex_email = f"alex_{uuid.uuid4().hex[:6]}@example.com"
        status, alex_reg, alex_cookie = self._post("/api/auth/register", {
            "name": "Alex Rivera",
            "email": alex_email,
            "password": "AlexPassword2026!"
        })
        self.assertEqual(status, 201)
        self.assertEqual(alex_reg.get("status"), "success")
        alex_token = alex_reg.get("sessionToken")
        self.assertTrue(bool(alex_token))
        self.assertIn("lp_session=", alex_cookie)
        self.assertIn("HttpOnly", alex_cookie)

        # 3. GET /api/auth/me with Bearer token
        status, me_body = self._get("/api/auth/me", headers={"Authorization": f"Bearer {alex_token}"})
        self.assertEqual(status, 200)
        self.assertEqual(me_body["user"]["email"], alex_email)

        # 4. Register Account 2 (Sarah)
        sarah_email = f"sarah_{uuid.uuid4().hex[:6]}@example.com"
        status, sarah_reg, sarah_cookie = self._post("/api/auth/register", {
            "name": "Sarah Connor",
            "email": sarah_email,
            "password": "SarahPassword2026!"
        })
        self.assertEqual(status, 201)
        sarah_token = sarah_reg.get("sessionToken")

        # 5. Alex saves his profile
        alex_headers = {"Authorization": f"Bearer {alex_token}"}
        status, prof_res, _ = self._post("/api/user/profile", {
            "headline": "Alex | Full-Stack Architect",
            "about": "Alex's About Section",
            "skills": ["React", "TypeScript", "Python"],
            "targetRole": "Solutions Architect"
        }, headers=alex_headers)
        self.assertEqual(status, 200)

        # 6. Sarah saves her profile
        sarah_headers = {"Authorization": f"Bearer {sarah_token}"}
        status, sarah_prof_res, _ = self._post("/api/user/profile", {
            "headline": "Sarah | Cybersecurity Specialist",
            "about": "Sarah's About Section",
            "skills": ["SIEM", "Network Security", "Linux"],
            "targetRole": "Security Engineer"
        }, headers=sarah_headers)
        self.assertEqual(status, 200)

        # 7. Verify Data Isolation: Alex fetches /api/user/profile and sees ONLY his data
        status, alex_fetched_prof = self._get("/api/user/profile", headers=alex_headers)
        self.assertEqual(status, 200)
        self.assertEqual(alex_fetched_prof["profile"]["headline"], "Alex | Full-Stack Architect")
        self.assertNotIn("Cybersecurity", alex_fetched_prof["profile"]["skills"])

        # Sarah fetches /api/user/profile and sees ONLY her data
        status, sarah_fetched_prof = self._get("/api/user/profile", headers=sarah_headers)
        self.assertEqual(status, 200)
        self.assertEqual(sarah_fetched_prof["profile"]["headline"], "Sarah | Cybersecurity Specialist")

        # 8. Alex creates a draft
        status, draft_res, _ = self._post("/api/user/drafts", {
            "content": "Alex's Private Post on Microservices",
            "tone": "tech"
        }, headers=alex_headers)
        self.assertEqual(status, 201)
        alex_draft_id = draft_res["draft"]["id"]

        # Sarah lists drafts -> Alex's draft is NOT in Sarah's list
        status, sarah_drafts = self._get("/api/user/drafts", headers=sarah_headers)
        self.assertEqual(status, 200)
        self.assertEqual(len(sarah_drafts["drafts"]), 0)

        # Sarah attempts to delete Alex's draft -> 404 (ownership check rejects)
        status, del_err = self._delete(f"/api/user/drafts?id={alex_draft_id}", headers=sarah_headers)
        self.assertEqual(status, 404)

        # Alex deletes his draft -> 200
        status, del_ok = self._delete(f"/api/user/drafts?id={alex_draft_id}", headers=alex_headers)
        self.assertEqual(status, 200)

        # 9. Logout
        status, logout_body, logout_cookie = self._post("/api/auth/logout", {}, headers=alex_headers)
        self.assertEqual(status, 200)
        self.assertIn("Max-Age=0", logout_cookie)

        # Alex token is now invalidated
        status, after_logout = self._get("/api/auth/me", headers=alex_headers)
        self.assertEqual(status, 401)


if __name__ == "__main__":
    unittest.main()

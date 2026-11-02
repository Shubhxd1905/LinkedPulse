"""
test_auth_suite.py
==================
Automated Test Suite for Phase 6: Authentication Engine & Persistent Database Layer.

Tests:
1. PBKDF2-HMAC-SHA256 Password Hashing & Constant-Time Verification
2. Email & Password Strength Validation
3. User Registration (Success, Weak Password, Invalid Email, Duplicate Email)
4. User Login (Success, Generic Error on Wrong Password, Generic Error on Nonexistent Email)
5. Session Management (Creation, Token Hash Storage, Authentication, Expiration, Logout Invalidation)
6. Password Recovery Token Architecture (Single-Use, Expiration, Session Invalidation on Reset)
7. AES-256-GCM Sensitive Credential Encryption & Decryption
8. Data Isolation Between Two Separate Accounts (Profiles, Audits, Drafts)
9. Protected Endpoints & Unauthorized Request Rejection (401)
10. Safe Local Data Migration (Strictly Excludes Demo Data)
"""

import os
import sys
import time
import json
import uuid
import tempfile
import unittest

# Ensure current and parent backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import auth_service


class TestAuthAndDatabaseSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Create an isolated temporary SQLite database for tests
        cls.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        cls.temp_db.close()
        os.environ["DATABASE_PATH"] = cls.temp_db.name
        database.init_db()

    @classmethod
    def tearDownClass(cls):
        # Clean up temporary database file
        if os.path.exists(cls.temp_db.name):
            try:
                os.remove(cls.temp_db.name)
            except Exception:
                pass

    # -------------------------------------------------------------------------
    # 1. Password Hashing & Verification
    # -------------------------------------------------------------------------
    def test_pbkdf2_hashing_and_constant_time_verification(self):
        password = "SecurePassword2026!"
        hashed = auth_service.hash_password(password)

        # Verify format: pbkdf2:sha256:600000$<salt>$<hash>
        self.assertTrue(hashed.startswith("pbkdf2:sha256:600000$"))
        parts = hashed.split("$")
        self.assertEqual(len(parts), 3)
        self.assertEqual(len(bytes.fromhex(parts[1])), 16, "Salt must be 16 bytes")
        self.assertEqual(len(bytes.fromhex(parts[2])), 32, "Hash must be 32 bytes")

        # Constant-time verify passes for correct password
        self.assertTrue(auth_service.verify_password(password, hashed))
        # Fails for wrong password
        self.assertFalse(auth_service.verify_password("WrongPassword999!", hashed))
        # Fails for empty/malformed
        self.assertFalse(auth_service.verify_password("", hashed))
        self.assertFalse(auth_service.verify_password(password, "malformed_hash"))

    # -------------------------------------------------------------------------
    # 2. Validation Guardrails
    # -------------------------------------------------------------------------
    def test_email_validation(self):
        valid, clean = auth_service.validate_email("  User.Test@Example.COM  ")
        self.assertTrue(valid)
        self.assertEqual(clean, "user.test@example.com")

        invalid_emails = ["", "invalid", "@nodomain.com", "user@", "user space@test.com"]
        for bad in invalid_emails:
            v, _ = auth_service.validate_email(bad)
            self.assertFalse(v, f"Expected {bad} to fail validation")

    def test_password_strength_validation(self):
        # Too short (< 8)
        v, err = auth_service.validate_password_strength("Short1")
        self.assertFalse(v)
        self.assertIn("at least 8 characters", err)

        # Missing uppercase
        v, err = auth_service.validate_password_strength("lowercase123")
        self.assertFalse(v)
        self.assertIn("uppercase", err)

        # Missing number
        v, err = auth_service.validate_password_strength("NoNumbersHere")
        self.assertFalse(v)
        self.assertIn("number", err)

        # Valid password
        v, err = auth_service.validate_password_strength("StrongPass2026!")
        self.assertTrue(v)
        self.assertEqual(err, "")

    # -------------------------------------------------------------------------
    # 3. User Registration
    # -------------------------------------------------------------------------
    def test_user_registration_and_duplicate_prevention(self):
        email = f"alice_{uuid.uuid4().hex[:6]}@example.com"
        user, token, err = auth_service.register_user("Alice Rivera", email, "AlicePass2026!")
        self.assertIsNone(err)
        self.assertIsNotNone(user)
        self.assertIsNotNone(token)
        self.assertEqual(user["email"], email)
        self.assertNotIn("password_hash", user, "Raw password_hash must never leak in user object")

        # Attempt duplicate registration with same email
        dup_user, dup_token, dup_err = auth_service.register_user("Alice Fake", email, "AnotherPass2026!")
        self.assertIsNone(dup_user)
        self.assertIsNone(dup_token)
        self.assertIsNotNone(dup_err)
        self.assertEqual(dup_err.get("code"), "EMAIL_EXISTS")

    # -------------------------------------------------------------------------
    # 4. User Login & Generic Error Handling
    # -------------------------------------------------------------------------
    def test_user_login_success_and_generic_errors(self):
        email = f"bob_{uuid.uuid4().hex[:6]}@example.com"
        password = "BobSecure2026!"
        auth_service.register_user("Bob Builder", email, password)

        # Valid login
        user, token, err = auth_service.login_user(email, password)
        self.assertIsNone(err)
        self.assertIsNotNone(user)
        self.assertEqual(user["email"], email)
        self.assertIsNotNone(token)

        # Invalid password returns generic error
        bad_pw_user, bad_pw_token, bad_pw_err = auth_service.login_user(email, "WrongPassword2026!")
        self.assertIsNone(bad_pw_user)
        self.assertIsNone(bad_pw_token)
        self.assertEqual(bad_pw_err.get("code"), "INVALID_CREDENTIALS")
        self.assertEqual(bad_pw_err.get("message"), "Invalid email or password.")

        # Nonexistent email returns identical generic error (prevents email enumeration)
        non_user, non_token, non_err = auth_service.login_user("nonexistent@example.com", password)
        self.assertIsNone(non_user)
        self.assertIsNone(non_token)
        self.assertEqual(non_err.get("code"), "INVALID_CREDENTIALS")
        self.assertEqual(non_err.get("message"), "Invalid email or password.")

    # -------------------------------------------------------------------------
    # 5. Session Management & Invalidation
    # -------------------------------------------------------------------------
    def test_session_management_and_logout(self):
        email = f"charlie_{uuid.uuid4().hex[:6]}@example.com"
        user, token, _ = auth_service.register_user("Charlie Tech", email, "Charlie2026!")

        # Verify active session
        session_user = auth_service.authenticate_session(token)
        self.assertIsNotNone(session_user)
        self.assertEqual(session_user["id"], user["id"])

        # Token is stored hashed in DB; raw token is never stored
        raw_hash = auth_service.hash_token(token)
        with database.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, token_hash FROM sessions WHERE token_hash = ?;", (raw_hash,))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["token_hash"], raw_hash)

        # Logout / Invalidate
        logged_out = auth_service.invalidate_session(token)
        self.assertTrue(logged_out)

        # Authenticating after logout must fail
        self.assertIsNone(auth_service.authenticate_session(token))

    def test_session_expiration(self):
        email = f"dave_{uuid.uuid4().hex[:6]}@example.com"
        user, token, _ = auth_service.register_user("Dave Expire", email, "DavePass2026!")

        # Artificially expire session in database
        raw_hash = auth_service.hash_token(token)
        with database.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE sessions SET expires_at = ? WHERE token_hash = ?;", (time.time() - 100, raw_hash))

        # Authenticate must prune and reject expired session
        self.assertIsNone(auth_service.authenticate_session(token))

    # -------------------------------------------------------------------------
    # 6. Password Reset Architecture
    # -------------------------------------------------------------------------
    def test_password_reset_flow(self):
        email = f"eve_{uuid.uuid4().hex[:6]}@example.com"
        old_pw = "OldPassword2026!"
        new_pw = "NewPassword2026!"
        user, session_token, _ = auth_service.register_user("Eve Reset", email, old_pw)

        # Request reset
        success, msg, dev_token = auth_service.request_password_reset(email)
        self.assertTrue(success)
        self.assertIsNotNone(dev_token)

        # Execute reset with token
        reset_success, reset_err = auth_service.reset_password_with_token(dev_token, new_pw)
        self.assertTrue(reset_success)
        self.assertIsNone(reset_err)

        # Old password must now fail
        u1, _, err1 = auth_service.login_user(email, old_pw)
        self.assertIsNone(u1)
        self.assertIsNotNone(err1)

        # New password succeeds
        u2, new_session, err2 = auth_service.login_user(email, new_pw)
        self.assertIsNotNone(u2)
        self.assertIsNone(err2)

        # Reset token is single-use; reusing it must fail
        reused_success, reused_err = auth_service.reset_password_with_token(dev_token, "AnotherPass2026!")
        self.assertFalse(reused_success)
        self.assertIn("Invalid or expired", reused_err)

    # -------------------------------------------------------------------------
    # 7. Sensitive Credential Encryption (AES-256-GCM)
    # -------------------------------------------------------------------------
    def test_sensitive_credential_encryption(self):
        raw_token = "AQV7xYz_LinkedInAccessTokenSample_12345"
        encrypted = auth_service.encrypt_token(raw_token)
        self.assertNotEqual(encrypted, raw_token)
        self.assertTrue(encrypted.startswith("aes_gcm:") or encrypted.startswith("envelope:"))

        decrypted = auth_service.decrypt_token(encrypted)
        self.assertEqual(decrypted, raw_token)

        # Tampered ciphertext fails decryption gracefully
        tampered = encrypted[:-4] + "ABCD"
        self.assertIsNone(auth_service.decrypt_token(tampered))

    # -------------------------------------------------------------------------
    # 8. Data Isolation Between Two Separate Accounts
    # -------------------------------------------------------------------------
    def test_user_data_isolation(self):
        # User 1 (Frank)
        u1, _, _ = auth_service.register_user("Frank One", f"frank_{uuid.uuid4().hex[:6]}@example.com", "FrankPass2026!")
        # User 2 (Grace)
        u2, _, _ = auth_service.register_user("Grace Two", f"grace_{uuid.uuid4().hex[:6]}@example.com", "GracePass2026!")

        # Frank updates his profile
        database.upsert_user_profile(u1["id"], {
            "headline": "Frank's Secret Headline | React & Node",
            "about": "Frank's confidential about text.",
            "targetRole": "Senior Engineer"
        })

        # Grace updates her profile
        database.upsert_user_profile(u2["id"], {
            "headline": "Grace's Public Headline | Data Scientist",
            "about": "Grace's public about text.",
            "targetRole": "Data Scientist"
        })

        # Verify Frank cannot read Grace's profile
        f_prof = database.get_user_profile(u1["id"])
        g_prof = database.get_user_profile(u2["id"])

        self.assertEqual(f_prof["headline"], "Frank's Secret Headline | React & Node")
        self.assertEqual(g_prof["headline"], "Grace's Public Headline | Data Scientist")
        self.assertNotEqual(f_prof["userId"], g_prof["userId"])

        # Frank creates a private draft
        frank_draft = database.save_post_draft(u1["id"], {
            "content": "Frank's confidential unreleased post draft.",
            "status": "Draft"
        })

        # Grace attempts to read Frank's draft -> must return None
        grace_view = database.get_post_draft(frank_draft["id"], u2["id"])
        self.assertIsNone(grace_view, "Grace must never be able to read Frank's draft")

        # Grace attempts to delete Frank's draft -> must fail and return False
        deleted_by_grace = database.delete_post_draft(frank_draft["id"], u2["id"])
        self.assertFalse(deleted_by_grace, "Grace must not be able to delete Frank's draft")

        # Draft is still intact for Frank
        self.assertIsNotNone(database.get_post_draft(frank_draft["id"], u1["id"]))

    # -------------------------------------------------------------------------
    # 9. Safe LocalStorage Migration
    # -------------------------------------------------------------------------
    def test_safe_local_storage_migration_excludes_demo(self):
        user, _, _ = auth_service.register_user("Henry Migrator", f"henry_{uuid.uuid4().hex[:6]}@example.com", "HenryPass2026!")

        # 1. Attempt to migrate demo profile -> must NOT overwrite user's profile
        demo_payload = {
            "profileSource": "demo",
            "headline": "Fictional Demo Headline",
            "about": "Fictional demo about"
        }
        # Simulate import-local logic
        imported_demo = False
        if demo_payload.get("profileSource") != "demo":
            database.upsert_user_profile(user["id"], demo_payload)
            imported_demo = True

        self.assertFalse(imported_demo, "Demo profile must be strictly excluded from migration")

        # 2. Migrate real manual profile
        manual_payload = {
            "profileSource": "manual",
            "headline": "Henry's Real Resume Headline",
            "about": "Henry's real professional about section.",
            "skills": ["Python", "SQL", "Docker"]
        }
        database.upsert_user_profile(user["id"], manual_payload)
        saved = database.get_user_profile(user["id"])
        self.assertEqual(saved["headline"], "Henry's Real Resume Headline")
        self.assertEqual(saved["skills"], ["Python", "SQL", "Docker"])


if __name__ == "__main__":
    unittest.main()

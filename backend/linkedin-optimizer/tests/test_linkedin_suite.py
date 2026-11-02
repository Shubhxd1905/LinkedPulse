"""
test_linkedin_suite.py
======================
Automated Test Suite for LinkedIn OAuth 2.0 Authorization & Direct Publishing Service.

Tests:
1. CSRF State Nonce Generation, Validation, Single-Use, and Expiration
2. Environment Configuration Check & Token Info Sanitization (Zero Token Leakage)
3. API Version Management: Active Default (202610), Custom Env Override & Format Guardrails
4. Mandatory REST Headers Construction (LinkedIn-Version, X-Restli-Protocol-Version)
5. Authorization URL Construction with Scopes (openid, profile, email, w_member_social)
6. OAuth Code Exchange & Member Profile Resolution (Mocked LinkedIn APIs)
7. Text Post Publishing via Official REST API (/rest/posts)
8. Multi-Step Image Post Publishing (/rest/images upload + binary PUT + post commentary)
9. Error Handling: 426 Unsupported Version, 401 Expired Token, 403 Forbidden Scopes, 429 Rate Limiting
10. Image Upload Binary Failure & Safe Logging Validation
11. Disconnect & Token Revocation
"""

import os
import sys
import time
import json
import base64
import io
import unittest
from unittest.mock import patch, MagicMock

# Ensure current and parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import linkedin_service as ls


class TestLinkedInOAuthAndPublishing(unittest.TestCase):

    def setUp(self):
        # Clear state store and token store before each test
        ls.OAUTH_STATE_STORE.clear()
        if os.path.exists(ls.TOKEN_STORE_FILE):
            try:
                os.remove(ls.TOKEN_STORE_FILE)
            except Exception:
                pass

    def tearDown(self):
        ls.OAUTH_STATE_STORE.clear()
        if os.path.exists(ls.TOKEN_STORE_FILE):
            try:
                os.remove(ls.TOKEN_STORE_FILE)
            except Exception:
                pass

    # -------------------------------------------------------------------------
    # 1. CSRF State Nonce Validation
    # -------------------------------------------------------------------------
    def test_csrf_state_generation_and_consumption(self):
        state = ls.generate_oauth_state()
        self.assertTrue(bool(state))
        self.assertGreater(len(state), 20)

        # First validation must succeed
        self.assertTrue(ls.validate_oauth_state(state))

        # Replay attack prevention: second validation of the same state MUST fail
        self.assertFalse(ls.validate_oauth_state(state))

    def test_csrf_state_expiration(self):
        state = ls.generate_oauth_state()
        # Simulate time advancing beyond TTL (10 minutes)
        ls.OAUTH_STATE_STORE[state] = time.time() - 5.0
        self.assertFalse(ls.validate_oauth_state(state))

    def test_invalid_state_rejection(self):
        self.assertFalse(ls.validate_oauth_state(""))
        self.assertFalse(ls.validate_oauth_state("random-unissued-token"))
        self.assertFalse(ls.validate_oauth_state(None))

    # -------------------------------------------------------------------------
    # 2. Configuration & Sanitized Token Info
    # -------------------------------------------------------------------------
    def test_unconfigured_state_detection(self):
        with patch.dict(os.environ, {"LINKEDIN_CLIENT_ID": "", "LINKEDIN_CLIENT_SECRET": ""}):
            self.assertFalse(ls.is_linkedin_configured())
            status = ls.get_token_info()
            self.assertFalse(status["isConfigured"])
            self.assertFalse(status["isConnected"])
            # Ensure accessToken is NEVER present in status dictionary
            self.assertNotIn("accessToken", status)
            self.assertNotIn("access_token", status)

    def test_token_info_reports_valid_connection_without_token_leak(self):
        test_store = {
            "accessToken": "secret-oauth-bearer-token-12345",
            "expiresAt": time.time() + 86400,
            "connectedAt": "2026-10-27T10:00:00.000Z",
            "memberUrn": "urn:li:person:abcdef",
            "memberName": "Jane Developer",
            "memberPicture": "https://media.licdn.com/dms/image/v2/test.jpg",
            "memberEmail": "jane@example.com",
            "scope": ["openid", "profile", "email", "w_member_social"],
        }
        ls.save_token_store(test_store)

        with patch.dict(os.environ, {"LINKEDIN_CLIENT_ID": "test-id", "LINKEDIN_CLIENT_SECRET": "test-sec"}):
            status = ls.get_token_info()
            self.assertTrue(status["isConfigured"])
            self.assertTrue(status["isConnected"])
            self.assertFalse(status["isExpired"])
            self.assertEqual(status["memberName"], "Jane Developer")
            self.assertEqual(status["memberUrn"], "urn:li:person:abcdef")
            # Strict security assertion: accessToken MUST NOT be returned in status
            self.assertNotIn("accessToken", status)
            self.assertNotIn("access_token", status)

    def test_token_expiration_flagging(self):
        expired_store = {
            "accessToken": "expired-bearer-token",
            "expiresAt": time.time() - 100,  # Expired in past
            "memberUrn": "urn:li:person:abcdef",
            "memberName": "Jane Developer",
        }
        ls.save_token_store(expired_store)

        status = ls.get_token_info()
        self.assertFalse(status["isConnected"])
        self.assertTrue(status["isExpired"])

    # -------------------------------------------------------------------------
    # 3. API Version Management & Header Construction
    # -------------------------------------------------------------------------
    def test_api_version_default_and_env_override(self):
        # Default should be the verified active supported version 202610
        with patch.dict(os.environ, {"LINKEDIN_API_VERSION": ""}):
            self.assertEqual(ls.get_linkedin_api_version(), "202610")

        # Valid override
        with patch.dict(os.environ, {"LINKEDIN_API_VERSION": "202608"}):
            self.assertEqual(ls.get_linkedin_api_version(), "202608")

        # Malformed override should gracefully fall back to default
        with patch.dict(os.environ, {"LINKEDIN_API_VERSION": "invalid-version"}):
            self.assertEqual(ls.get_linkedin_api_version(), "202610")

    def test_get_linkedin_rest_headers_structure(self):
        with patch.dict(os.environ, {"LINKEDIN_API_VERSION": "202610"}):
            headers = ls.get_linkedin_rest_headers("test-token-123", content_type="application/json")
            self.assertEqual(headers["Authorization"], "Bearer test-token-123")
            self.assertEqual(headers["X-Restli-Protocol-Version"], "2.0.0")
            self.assertEqual(headers["LinkedIn-Version"], "202610")
            self.assertEqual(headers["Content-Type"], "application/json")

    # -------------------------------------------------------------------------
    # 4. Authorization URL Construction
    # -------------------------------------------------------------------------
    def test_build_authorization_url_contains_required_scopes(self):
        with patch.dict(os.environ, {
            "LINKEDIN_CLIENT_ID": "mock_client_id_123",
            "LINKEDIN_CLIENT_SECRET": "mock_secret",
            "LINKEDIN_REDIRECT_URI": "http://localhost:8000/api/linkedin/callback"
        }):
            auth_url, state, err = ls.build_authorization_url()
            self.assertIsNone(err)
            self.assertIsNotNone(auth_url)
            self.assertIn("https://www.linkedin.com/oauth/v2/authorization", auth_url)
            self.assertIn("client_id=mock_client_id_123", auth_url)
            self.assertIn("redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Flinkedin%2Fcallback", auth_url)
            self.assertIn("openid", auth_url)
            self.assertIn("profile", auth_url)
            self.assertIn("w_member_social", auth_url)
            self.assertIn(f"state={state}", auth_url)

    # -------------------------------------------------------------------------
    # 5. OAuth Code Exchange
    # -------------------------------------------------------------------------
    @patch("linkedin_service.requests.get")
    @patch("linkedin_service.requests.post")
    def test_exchange_code_success(self, mock_post, mock_get):
        state = ls.generate_oauth_state()

        # Mock token exchange
        mock_token_resp = MagicMock()
        mock_token_resp.status_code = 200
        mock_token_resp.json.return_value = {
            "access_token": "aq-mock-linkedin-access-token",
            "expires_in": 5184000,
            "scope": "openid profile email w_member_social",
        }
        mock_post.return_value = mock_token_resp

        # Mock userinfo OIDC endpoint
        mock_userinfo_resp = MagicMock()
        mock_userinfo_resp.status_code = 200
        mock_userinfo_resp.json.return_value = {
            "sub": "user_12345_xyz",
            "name": "Alex Engineer",
            "given_name": "Alex",
            "family_name": "Engineer",
            "picture": "https://media.licdn.com/dms/image/v2/profile.jpg",
            "email": "alex@example.com",
        }
        mock_get.return_value = mock_userinfo_resp

        with patch.dict(os.environ, {
            "LINKEDIN_CLIENT_ID": "mock_client_id",
            "LINKEDIN_CLIENT_SECRET": "mock_client_secret",
            "LINKEDIN_REDIRECT_URI": "http://localhost:8000/api/linkedin/callback",
        }):
            res = ls.exchange_code_for_token("mock_authorization_code", state)
            self.assertTrue(res["success"])
            self.assertEqual(res["memberName"], "Alex Engineer")
            self.assertEqual(res["memberUrn"], "urn:li:person:user_12345_xyz")

            # Verify persisted store
            store = ls.load_token_store()
            self.assertEqual(store["accessToken"], "aq-mock-linkedin-access-token")
            self.assertEqual(store["memberUrn"], "urn:li:person:user_12345_xyz")
            self.assertEqual(store["memberName"], "Alex Engineer")
            self.assertEqual(store["memberEmail"], "alex@example.com")

    # -------------------------------------------------------------------------
    # 6. Text Post Publishing
    # -------------------------------------------------------------------------
    @patch("linkedin_service.requests.post")
    def test_publish_text_post_success(self, mock_post):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
            "memberName": "Alex Engineer",
        })

        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 201
        mock_post_resp.headers = {"x-restli-id": "urn:li:share:7123456789012345678"}
        mock_post.return_value = mock_post_resp

        result = ls.publish_linkedin_post("Super exciting product update! #tech #innovation")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["postUrn"], "urn:li:share:7123456789012345678")
        self.assertIn("urn:li:share:7123456789012345678", result["shareUrl"])
        self.assertFalse(result["hasImage"])

        # Check request headers & payload structure
        call_kwargs = mock_post.call_args[1]
        headers = call_kwargs["headers"]
        payload = call_kwargs["json"]
        self.assertEqual(headers["LinkedIn-Version"], ls.get_linkedin_api_version())
        self.assertEqual(headers["X-Restli-Protocol-Version"], "2.0.0")
        self.assertEqual(payload["author"], "urn:li:person:user_12345_xyz")
        self.assertEqual(payload["commentary"], "Super exciting product update! #tech #innovation")
        self.assertEqual(payload["visibility"], "PUBLIC")

    def test_publish_without_connection_fails(self):
        result = ls.publish_linkedin_post("Test post")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "NOT_CONNECTED")

    def test_publish_empty_content_fails(self):
        ls.save_token_store({
            "accessToken": "valid-token",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:xyz",
        })
        result = ls.publish_linkedin_post("    ")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "EMPTY_CONTENT")

    # -------------------------------------------------------------------------
    # 7. Multi-Step Image Publishing
    # -------------------------------------------------------------------------
    @patch("linkedin_service.requests.get")
    @patch("linkedin_service.requests.put")
    @patch("linkedin_service.requests.post")
    def test_publish_image_post_success(self, mock_post, mock_put, mock_get):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
            "memberName": "Alex Engineer",
        })

        # Step 1: Mock Image Init Response
        mock_init_resp = MagicMock()
        mock_init_resp.status_code = 200
        mock_init_resp.json.return_value = {
            "value": {
                "uploadUrl": "https://api.linkedin.com/mediaUpload/123",
                "image": "urn:li:image:D4E10AQH_mock_image_urn",
            }
        }

        # Step 2: Mock Publish Post Response
        mock_publish_resp = MagicMock()
        mock_publish_resp.status_code = 201
        mock_publish_resp.headers = {"x-restli-id": "urn:li:share:8888888888"}

        mock_post.side_effect = [mock_init_resp, mock_publish_resp]

        # Mock binary PUT response
        mock_put_resp = MagicMock()
        mock_put_resp.status_code = 201
        mock_put.return_value = mock_put_resp

        # Mock image status check (GET /rest/images/{urn})
        mock_status_resp = MagicMock()
        mock_status_resp.status_code = 200
        mock_status_resp.json.return_value = {"status": "AVAILABLE"}
        mock_get.return_value = mock_status_resp

        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        result = ls.publish_linkedin_post("Post with image attachment", image_base64=sample_b64)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["postUrn"], "urn:li:share:8888888888")
        self.assertTrue(result["hasImage"])

        # Verify initialization request used active LinkedIn-Version header
        init_call_headers = mock_post.call_args_list[0][1]["headers"]
        self.assertEqual(init_call_headers["LinkedIn-Version"], ls.get_linkedin_api_version())
        self.assertEqual(init_call_headers["X-Restli-Protocol-Version"], "2.0.0")

        # Verify binary PUT was called on uploadUrl
        mock_put.assert_called_once()
        self.assertEqual(mock_put.call_args[0][0], "https://api.linkedin.com/mediaUpload/123")

        # Verify post payload references the image urn
        post_payload = mock_post.call_args_list[1][1]["json"]
        self.assertEqual(post_payload["content"]["media"]["id"], "urn:li:image:D4E10AQH_mock_image_urn")

    # -------------------------------------------------------------------------
    # 8. Outdated Version 426 Error Handling (Images API & Posts API)
    # -------------------------------------------------------------------------
    @patch("linkedin_service.requests.post")
    def test_image_upload_initialization_version_426_error(self, mock_post):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
            "memberName": "Alex Engineer",
        })

        # Mock LinkedIn returning HTTP 426 Upgrade Required / NONEXISTENT_VERSION
        mock_426_resp = MagicMock()
        mock_426_resp.status_code = 426
        mock_426_resp.json.return_value = {
            "status": 426,
            "code": "NONEXISTENT_VERSION",
            "message": "version 202401 is not active."
        }
        mock_426_resp.text = '{"status": 426, "code": "NONEXISTENT_VERSION", "message": "version 202401 is not active."}'
        mock_post.return_value = mock_426_resp

        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        result = ls.publish_linkedin_post("Test post", image_base64=sample_b64)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "UNSUPPORTED_API_VERSION")
        self.assertEqual(result["statusCode"], 426)
        self.assertIn("LINKEDIN_API_VERSION", result["message"])
        self.assertIn("version 202401 is not active", result["details"])

    @patch("linkedin_service.requests.post")
    def test_post_publish_version_426_error(self, mock_post):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
            "memberName": "Alex Engineer",
        })

        # Mock LinkedIn returning HTTP 426 on post creation
        mock_426_resp = MagicMock()
        mock_426_resp.status_code = 426
        mock_426_resp.json.return_value = {
            "status": 426,
            "code": "NONEXISTENT_VERSION",
            "message": "version 202401 is not active."
        }
        mock_426_resp.text = '{"status": 426, "code": "NONEXISTENT_VERSION", "message": "version 202401 is not active."}'
        mock_post.return_value = mock_426_resp

        result = ls.publish_linkedin_post("Text-only test post")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "UNSUPPORTED_API_VERSION")
        self.assertEqual(result["statusCode"], 426)

    # -------------------------------------------------------------------------
    # 9. Permission and Rate Limiting Error Handling
    # -------------------------------------------------------------------------
    @patch("linkedin_service.requests.post")
    def test_image_upload_initialization_permission_403_error(self, mock_post):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
        })

        mock_403_resp = MagicMock()
        mock_403_resp.status_code = 403
        mock_403_resp.json.return_value = {
            "status": 403,
            "message": "Not enough permissions to access: POST /images"
        }
        mock_403_resp.text = '{"status": 403, "message": "Not enough permissions to access: POST /images"}'
        mock_post.return_value = mock_403_resp

        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        result = ls.publish_linkedin_post("Test post", image_base64=sample_b64)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "PERMISSION_DENIED")
        self.assertEqual(result["statusCode"], 403)
        self.assertIn("w_member_social", result["message"])

    @patch("linkedin_service.requests.put")
    @patch("linkedin_service.requests.post")
    def test_image_binary_put_failure_handled(self, mock_post, mock_put):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
        })

        mock_init_resp = MagicMock()
        mock_init_resp.status_code = 200
        mock_init_resp.json.return_value = {
            "value": {
                "uploadUrl": "https://api.linkedin.com/mediaUpload/fail",
                "image": "urn:li:image:test",
            }
        }
        mock_post.return_value = mock_init_resp

        # Mock binary PUT failing with 500 Internal Error
        mock_put_resp = MagicMock()
        mock_put_resp.status_code = 500
        mock_put_resp.text = "Internal Storage Error"
        mock_put_resp.json.side_effect = Exception("Not JSON")
        mock_put.return_value = mock_put_resp

        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        result = ls.publish_linkedin_post("Test post", image_base64=sample_b64)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["statusCode"], 500)

    @patch("linkedin_service.requests.post")
    def test_publish_expired_token_clears_store(self, mock_post):
        ls.save_token_store({
            "accessToken": "revoked-or-expired-token",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
            "memberName": "Alex Engineer",
        })

        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 401
        mock_err_resp.text = '{"message": "Invalid access token"}'
        mock_err_resp.json.return_value = {"message": "Invalid access token"}
        mock_post.return_value = mock_err_resp

        result = ls.publish_linkedin_post("Test message")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "AUTH_EXPIRED")
        self.assertEqual(result["statusCode"], 401)

        # Token store must be wiped on 401 so frontend shows disconnected immediately
        self.assertFalse(os.path.exists(ls.TOKEN_STORE_FILE))

    @patch("linkedin_service.requests.post")
    def test_publish_rate_limited_error(self, mock_post):
        ls.save_token_store({
            "accessToken": "rate-limited-token",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:user_12345_xyz",
            "memberName": "Alex Engineer",
        })

        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 429
        mock_err_resp.text = '{"message": "Throttle limit reached"}'
        mock_err_resp.json.return_value = {"message": "Throttle limit reached"}
        mock_post.return_value = mock_err_resp

        result = ls.publish_linkedin_post("Test message")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["code"], "RATE_LIMITED")
        self.assertEqual(result["statusCode"], 429)

    # -------------------------------------------------------------------------
    # 10. Image Status Check & Safe Logging
    # -------------------------------------------------------------------------
    @patch("linkedin_service.requests.get")
    def test_check_image_status_write_only_token_graceful(self, mock_get):
        # When token has only w_member_social, LinkedIn GET /rest/images may return 403
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.text = "Forbidden for write-only token"
        mock_get.return_value = mock_resp

        ready, status_val, err = ls.check_image_status("urn:li:image:test1234", "token-xyz")
        # Should gracefully return ready=True without failing
        self.assertTrue(ready)
        self.assertEqual(status_val, "AVAILABLE")
        self.assertIsNone(err)

    def test_safe_logging_masks_tokens_and_secrets(self):
        log_stream = io.StringIO()
        with patch("sys.stdout", log_stream):
            sensitive_resp = '{"error": "invalid_grant", "access_token": "secret_abc123", "client_secret": "sec_789"}'
            ls.safe_log_linkedin_error("test_context", 400, sensitive_resp)

        logged = log_stream.getvalue()
        self.assertNotIn("secret_abc123", logged)
        self.assertNotIn("sec_789", logged)
        self.assertIn("[LinkedIn API Error]", logged)

    # -------------------------------------------------------------------------
    # 11. Disconnect / Clear Store
    # -------------------------------------------------------------------------
    def test_clear_token_store(self):
        ls.save_token_store({"accessToken": "abc", "memberUrn": "xyz"})
        self.assertTrue(os.path.exists(ls.TOKEN_STORE_FILE))

        ls.clear_token_store()
        self.assertFalse(os.path.exists(ls.TOKEN_STORE_FILE))
        status = ls.get_token_info()
        self.assertFalse(status["isConnected"])

    # -------------------------------------------------------------------------
    # 12. Profile URL Validation & Member Profile Fetch
    # -------------------------------------------------------------------------
    def test_validate_linkedin_profile_url_valid(self):
        valid_cases = [
            ("https://www.linkedin.com/in/alexrivera", "alexrivera"),
            ("http://linkedin.com/in/alex-rivera-123/", "alex-rivera-123"),
            ("https://linkedin.com/in/john_doe", "john_doe"),
            ("www.linkedin.com/in/shubham-kumar-9821", "shubham-kumar-9821"),
            ("https://in.linkedin.com/in/deepmind-dev/", "deepmind-dev"),
        ]
        for url, expected_vanity in valid_cases:
            valid, vanity, err = ls.validate_linkedin_profile_url(url)
            self.assertTrue(valid, f"Failed for valid URL: {url}")
            self.assertEqual(vanity, expected_vanity)
            self.assertIsNone(err)

    def test_validate_linkedin_profile_url_invalid(self):
        invalid_cases = [
            "",
            None,
            "not-a-url",
            "https://twitter.com/in/alexrivera",
            "https://facebook.com/alexrivera",
            "https://www.linkedin.com/company/google",
            "https://www.linkedin.com/school/stanford-university",
            "https://www.linkedin.com/feed/update/urn:li:activity:12345",
            "https://www.linkedin.com/in/",
            "https://www.linkedin.com/in/invalid user!",
        ]
        for url in invalid_cases:
            valid, vanity, err = ls.validate_linkedin_profile_url(url)
            self.assertFalse(valid, f"Expected invalid for: {url}")
            self.assertIsNone(vanity)
            self.assertIsInstance(err, str)

    def test_is_matching_member_url(self):
        # Match by name parts
        self.assertTrue(ls.is_matching_member_url("shubham-kumar", "Shubham Kumar", "urn:li:person:xyz"))
        self.assertTrue(ls.is_matching_member_url("shubham-kumar-1234", "Shubham Kumar", "urn:li:person:xyz"))
        # Match by URN suffix
        self.assertTrue(ls.is_matching_member_url("p7DvbIbMcL", "Unknown", "urn:li:person:p7DvbIbMcL"))
        # Non-matching third-party URL
        self.assertFalse(ls.is_matching_member_url("satyanadella", "Shubham Kumar", "urn:li:person:p7DvbIbMcL"))
        self.assertFalse(ls.is_matching_member_url("bill-gates-microsoft", "Shubham Kumar", "urn:li:person:p7DvbIbMcL"))

    def test_get_authenticated_member_profile_not_connected(self):
        res = ls.get_authenticated_member_profile()
        self.assertEqual(res["status"], "error")
        self.assertEqual(res["code"], "NOT_CONNECTED")

    def test_get_authenticated_member_profile_expired(self):
        ls.save_token_store({
            "accessToken": "expired-token",
            "expiresAt": time.time() - 3600,
            "memberUrn": "urn:li:person:user_123",
            "memberName": "Jane Doe",
        })
        res = ls.get_authenticated_member_profile()
        self.assertEqual(res["status"], "error")
        self.assertEqual(res["code"], "TOKEN_EXPIRED")

    def test_get_authenticated_member_profile_third_party_restricted(self):
        ls.save_token_store({
            "accessToken": "valid-token-xyz",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:p7DvbIbMcL",
            "memberName": "Shubham Kumar",
            "memberEmail": "shubham@example.com",
        })
        third_party_url = "https://www.linkedin.com/in/satyanadella"
        res = ls.get_authenticated_member_profile(profile_url=third_party_url)
        self.assertEqual(res["status"], "warning")
        self.assertEqual(res["code"], "THIRD_PARTY_PROFILE_RESTRICTED")
        self.assertEqual(res["authenticatedMember"]["name"], "Shubham Kumar")
        self.assertIn("privacy", res["message"].lower())
        self.assertEqual(res["targetVanityName"], "satyanadella")

    @patch("linkedin_service.fetch_member_profile")
    def test_get_authenticated_member_profile_success(self, mock_fetch):
        ls.save_token_store({
            "accessToken": "valid-token-12345",
            "expiresAt": time.time() + 3600,
            "memberUrn": "urn:li:person:p7DvbIbMcL",
            "memberName": "Shubham Kumar",
            "memberEmail": "shubham@example.com",
            "memberPicture": "https://media.licdn.com/dms/image/v2/test_avatar.jpg",
        })
        mock_fetch.return_value = {
            "success": True,
            "profile": {
                "sub": "p7DvbIbMcL",
                "name": "Shubham Kumar",
                "picture": "https://media.licdn.com/dms/image/v2/test_avatar.jpg",
                "email": "shubham@example.com",
            },
        }

        res = ls.get_authenticated_member_profile()
        self.assertEqual(res["status"], "success")
        self.assertIn("profile", res)
        self.assertEqual(res["profile"]["fullName"], "Shubham Kumar")
        self.assertEqual(res["profile"]["email"], "shubham@example.com")
        self.assertEqual(res["profile"]["picture"], "https://media.licdn.com/dms/image/v2/test_avatar.jpg")
        self.assertIn("fullName", res["availableFields"])
        self.assertIn("picture", res["availableFields"])
        self.assertIn("headline", res["missingFields"])
        self.assertIn("about", res["missingFields"])
        self.assertIn("experience", res["missingFields"])
        self.assertIn("skills", res["missingFields"])
        self.assertTrue(bool(res["limitationsNotice"]))


if __name__ == "__main__":
    unittest.main()

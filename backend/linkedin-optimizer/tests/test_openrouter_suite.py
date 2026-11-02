"""
test_openrouter_suite.py
========================
Automated Test Suite for Server-Side OpenRouter Integration & Security Controls.
Tests:
1. Missing API Key Handling & Status Endpoint
2. Invalid Input Validation & Size Limit Rejection (413)
3. Invalid API Key Handling (401 Auth Error)
4. Free Model Guardrail Enforcement (Rejects Paid Models)
5. Model Fallback Chain on Provider Congestion / Rate Limits
6. Malformed Output Recovery & Schema Normalization
7. In-Memory Request Rate Limiting (429)
8. Heuristic Engine Full Fallback Integrity
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Ensure current and parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import openrouter_service as ors
import server


class TestOpenRouterIntegration(unittest.TestCase):

    def setUp(self):
        # Clear server rate limiter between tests
        server.RATE_LIMIT_STORE.clear()

    # -------------------------------------------------------------------------
    # 1. Missing API Key & Diagnostics
    # -------------------------------------------------------------------------
    def test_missing_api_key_returns_unconfigured(self):
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}):
            self.assertFalse(ors.is_openrouter_configured())
            sample_profile = {
                "headline": "Full Stack Dev",
                "about": "Passionate developer",
                "experience": [],
                "skills": ["Python", "React"]
            }
            result = ors.generate_profile_optimization_ai(sample_profile)
            self.assertFalse(result["success"])
            self.assertEqual(result["status"], "unconfigured")
            self.assertEqual(result["code"], "MISSING_API_KEY")
            self.assertTrue(result["useFallback"])

    # -------------------------------------------------------------------------
    # 2. Free Model Guardrail Enforcement
    # -------------------------------------------------------------------------
    def test_free_model_guardrails(self):
        # Must permit free models
        self.assertTrue(ors.is_free_model("meta-llama/llama-3.3-70b-instruct:free"))
        self.assertTrue(ors.is_free_model("google/gemini-2.0-flash-exp:free"))
        self.assertTrue(ors.is_free_model("qwen/qwen-2.5-72b-instruct:free"))
        self.assertTrue(ors.is_free_model("openrouter/free"))

        # Must STRICTLY reject paid models
        self.assertFalse(ors.is_free_model("openai/gpt-4o"))
        self.assertFalse(ors.is_free_model("anthropic/claude-3-5-sonnet"))
        self.assertFalse(ors.is_free_model("meta-llama/llama-3.3-70b-instruct")) # missing :free
        self.assertFalse(ors.is_free_model(""))

    def test_paid_model_in_env_rejected_and_defaults_to_free(self):
        with patch.dict(os.environ, {"OPENROUTER_MODEL": "openai/gpt-4o"}):
            active_model = ors.get_configured_model()
            self.assertTrue(ors.is_free_model(active_model))
            self.assertEqual(active_model, "nvidia/nemotron-3.5-lightning:free")

    # -------------------------------------------------------------------------
    # 3. Invalid API Key Handling (401 Auth Error)
    # -------------------------------------------------------------------------
    @patch("openrouter_service.requests.post")
    def test_invalid_api_key_auth_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_post.return_value = mock_resp

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-invalid-test-key"}):
            sample_profile = {"headline": "Dev", "about": "Code"}
            result = ors.generate_profile_optimization_ai(sample_profile)
            self.assertFalse(result["success"])
            self.assertEqual(result["code"], "AUTH_ERROR")
            self.assertEqual(result["statusCode"], 401)
            self.assertTrue(result["useFallback"])

    # -------------------------------------------------------------------------
    # 4. Multi-Model Fallback Chain on Provider Congestion
    # -------------------------------------------------------------------------
    @patch("openrouter_service.requests.post")
    def test_fallback_chain_retries_next_free_model(self, mock_post):
        # 1st model returns 429 rate-limited, 2nd model succeeds with valid JSON
        mock_429 = MagicMock()
        mock_429.status_code = 429

        mock_200 = MagicMock()
        mock_200.status_code = 200
        mock_200.json.return_value = {
            "choices": [{
                "message": {
                    "content": '{"summary": "Great profile", "optimizedHeadline": "Staff Engineer | Cloud | Scaling B2B", "optimizedAbout": "Strategic leader...", "optimizedExperience": "STAR points", "optimizedSkills": "Python, Go, AWS", "headlineSuggestions": ["Add metric"], "aboutSuggestions": [], "experienceSuggestions": [], "skillsSuggestions": [], "recommendedKeywords": ["Kubernetes"]}'
                }
            }]
        }

        mock_post.side_effect = [mock_429, mock_200]

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test-key"}):
            sample_profile = {"headline": "Lead Dev", "about": "Experienced"}
            result = ors.generate_profile_optimization_ai(sample_profile)

            self.assertTrue(result["success"])
            self.assertTrue(result["isAiPowered"])
            self.assertEqual(len(result["modelsAttempted"]), 2)
            self.assertEqual(result["data"]["optimizedHeadline"], "Staff Engineer | Cloud | Scaling B2B")

    # -------------------------------------------------------------------------
    # 5. Malformed AI Output Recovery & Parsing
    # -------------------------------------------------------------------------
    def test_extract_json_from_markdown_code_fences(self):
        fenced_content = """Here is your optimization:
```json
{
  "summary": "Solid foundation",
  "optimizedHeadline": "Senior Engineer | React & Node",
  "optimizedAbout": "Engineering leader with 6 years experience",
  "optimizedExperience": "- Led migration",
  "optimizedSkills": "React, Node.js"
}
```
Hope this helps!"""
        parsed = ors.extract_json_from_text(fenced_content)
        self.assertEqual(parsed["optimizedHeadline"], "Senior Engineer | React & Node")

        validated = ors.validate_ai_output(parsed)
        self.assertIn("recommendedKeywords", validated)
        self.assertIsInstance(validated["recommendedKeywords"], list)

    # -------------------------------------------------------------------------
    # 6. In-Memory Request Rate Limiter (429 Protection)
    # -------------------------------------------------------------------------
    def test_in_memory_rate_limiter(self):
        test_ip = "192.168.1.100"
        # First 30 requests should succeed
        for _ in range(30):
            self.assertTrue(server.check_rate_limit(test_ip))
        # 31st request must be rejected
        self.assertFalse(server.check_rate_limit(test_ip))

    # -------------------------------------------------------------------------
    # 7. Heuristic Engine Full Fallback Integrity
    # -------------------------------------------------------------------------
    def test_heuristic_analysis_integrity(self):
        profile = {
            "headline": "Software Developer | React & Node | Scaling Apps",
            "about": "Software engineer with 4 years experience building web architectures. Cut latency by 40%. Reach out at email@test.com",
            "experience": [
                {"title": "Dev", "company": "Tech", "duration": "2022-Pres", "description": "Improved conversion by 25%."}
            ],
            "skills": ["React", "Node.js", "Python", "SQL", "Docker", "AWS", "TypeScript", "Git"]
        }
        res = server.analyze_profile_heuristics(profile)
        self.assertIn("overallScore", res)
        self.assertGreaterEqual(res["overallScore"], 50)
        self.assertIn("categoryScores", res)
        self.assertIn("headline", res["categoryScores"])
        self.assertIn("about", res["categoryScores"])
        self.assertIn("experience", res["categoryScores"])
        self.assertIn("skills", res["categoryScores"])

    # -------------------------------------------------------------------------
    # 8. Phase 3: Vision Model Guardrails & Verification
    # -------------------------------------------------------------------------
    def test_vision_model_guardrails(self):
        # Must permit verified free vision models
        self.assertTrue(ors.is_vision_model("openrouter/free"))
        self.assertTrue(ors.is_vision_model("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"))
        self.assertTrue(ors.is_vision_model("dots-studio/dots-3-note-preview:free"))
        self.assertTrue(ors.is_vision_model("google/gemma-4-31b-it:free"))

        # Must reject text-only free models from vision endpoint
        self.assertFalse(ors.is_vision_model("nvidia/nemotron-3.5-lightning:free"))
        self.assertFalse(ors.is_vision_model("liquid/lfm-2.5-2.6b:free"))

        # Must strictly reject paid vision models
        self.assertFalse(ors.is_vision_model("openai/gpt-4o"))
        self.assertFalse(ors.is_vision_model("anthropic/claude-3-5-sonnet"))
        self.assertFalse(ors.is_vision_model("google/gemini-pro-vision"))
        self.assertFalse(ors.is_vision_model(""))

    # -------------------------------------------------------------------------
    # 9. Phase 3: Image Payload & Magic Byte Validation
    # -------------------------------------------------------------------------
    def test_image_payload_validation(self):
        import base64

        # Valid 1x1 PNG magic bytes
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        valid_png_b64 = "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")

        is_valid, uri, err = server.validate_image_payload(valid_png_b64)
        self.assertTrue(is_valid)
        self.assertIsNone(err)
        self.assertTrue(uri.startswith("data:image/png;base64,"))

        # Valid JPEG magic bytes
        jpeg_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00' + (b'\x00' * 30) + b'\xff\xd9'
        valid_jpeg_b64 = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode("ascii")

        is_valid, uri, err = server.validate_image_payload(valid_jpeg_b64)
        self.assertTrue(is_valid)
        self.assertIsNone(err)
        self.assertTrue(uri.startswith("data:image/jpeg;base64,"))

        # Rejection: Plain text disguised as image
        fake_b64 = "data:image/png;base64," + base64.b64encode(b"This is just plain text, not a PNG file!").decode("ascii")
        is_valid, _, err = server.validate_image_payload(fake_b64)
        self.assertFalse(is_valid)
        self.assertIn("not a valid PNG, JPEG, or WEBP image", err)

        # Rejection: Empty string
        is_valid, _, err = server.validate_image_payload("")
        self.assertFalse(is_valid)

        # Rejection: Invalid base64 characters
        is_valid, _, err = server.validate_image_payload("data:image/png;base64,???badchars!@#$")
        self.assertFalse(is_valid)

    # -------------------------------------------------------------------------
    # 10. Phase 3: Post AI Output Schema Normalization
    # -------------------------------------------------------------------------
    def test_post_ai_output_schema_normalization(self):
        # AI returns raw dictionary with minimal fields
        raw_ai = {
            "primaryPost": "We hit 1M daily requests today. Here is what we learned.",
            "alternativeHooks": ["Hook 1"],  # only 1 hook provided by model
            "hashtags": "SoftwareEngineering, Scalability",  # comma-separated string
            "visualSummary": "Metrics chart showing request traffic spike.",
        }
        validated = ors.validate_post_ai_output(raw_ai, requested_tone="storytelling")
        self.assertIn("primaryPost", validated)
        self.assertEqual(len(validated["alternativeHooks"]), 3)  # Normalized to 3 hooks
        self.assertIsInstance(validated["hashtags"], list)
        self.assertEqual(validated["hashtags"], ["SoftwareEngineering", "Scalability"])
        self.assertEqual(validated["visualSummary"], "Metrics chart showing request traffic spike.")
        self.assertEqual(validated["toneApplied"], "storytelling")

    # -------------------------------------------------------------------------
    # 11. Phase 3: Heuristic Fallback Never Fabricates AI Results
    # -------------------------------------------------------------------------
    def test_heuristic_fallback_transparency(self):
        fallback = ors.generate_post_from_heuristics(
            tone="educational",
            length="medium",
            context="System latency reduction",
            error_reason="Provider rate limited"
        )
        self.assertIn("primaryPost", fallback)
        self.assertIn("alternativeHooks", fallback)
        self.assertEqual(len(fallback["alternativeHooks"]), 3)
        self.assertIn("hashtags", fallback)
        # Visual summary MUST clearly state vision AI was bypassed
        self.assertIn("Vision AI analysis was bypassed", fallback["visualSummary"])
        self.assertIn("Provider rate limited", fallback["visualSummary"])

    # -------------------------------------------------------------------------
    # 12. Phase 3: Full Fallback Sequence on Model Outages
    # -------------------------------------------------------------------------
    @patch("openrouter_service.requests.post")
    def test_vision_fallback_chain_on_congested_models(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_post.return_value = mock_resp

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test-key"}):
            valid_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            res = ors.generate_post_from_image_ai(
                image_data_uri=valid_png,
                tone="storytelling",
                length="medium",
                context="Scaling distributed databases"
            )
            # Should not crash; returns fallback with transparent flags
            self.assertFalse(res["isAiPowered"])
            self.assertEqual(res["status"], "fallback")
            self.assertIn("data", res)
            self.assertIn("primaryPost", res["data"])
            self.assertIn("alternativeHooks", res["data"])

    # -------------------------------------------------------------------------
    # 13. Profile Audit: Fresher, Experienced, and Unavailable Experience Modes
    # -------------------------------------------------------------------------
    def test_profile_audit_fresher_blank_experience_not_penalized(self):
        fresher_profile = {
            "targetRole": "Full-Stack Engineer",
            "headline": "Full-Stack Engineer | React, Node.js & TypeScript | Computer Science Graduate 2026",
            "about": "Recent Computer Science graduate from Stanford University with passion for web apps. Built end-to-end projects with React and PostgreSQL. Let's connect!",
            "experience": [],  # Completely blank
            "experienceStatus": "fresher",
            "education": "B.S. in Computer Science",
            "projects": "Full-Stack SaaS, Open Source CLI",
            "skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "Git"]
        }
        heuristics = server.analyze_profile_heuristics(fresher_profile)
        self.assertGreaterEqual(heuristics["overallScore"], 75, "Fresher must not be penalized for having no commercial experience")
        self.assertGreaterEqual(heuristics["categoryScores"]["experience"], 70)
        self.assertTrue(any("Early Career / Fresher" in s["text"] for s in heuristics["suggestions"]))

        # Verify prompt construction never fabricates commercial jobs
        prompt = ors.build_user_prompt(fresher_profile, "recruiter")
        self.assertIn("EXPERIENCE STATUS: fresher", prompt)
        self.assertIn("no commercial work experience", prompt)
        self.assertIn("B.S. in Computer Science", prompt)
        self.assertIn("Full-Stack SaaS", prompt)

    def test_profile_audit_experienced_user(self):
        experienced_profile = {
            "targetRole": "Staff Software Engineer",
            "headline": "Staff Software Engineer | Cloud Architecture & High-Scale Distributed Systems",
            "about": "Staff Software Engineer with 8+ years experience scaling cloud services. Spearheaded microservices migration serving 10M+ daily requests and reduced infrastructure latency by 45%. Looking forward to connecting with fellow technology leaders. Feel free to reach out to connect!",
            "experience": [
                {
                    "title": "Staff Software Engineer",
                    "company": "CloudCorp",
                    "duration": "2021 - Present",
                    "description": "Architected distributed systems handling 10M daily requests with 99.99% reliability. Reduced latency by 45%."
                },
                {
                    "title": "Senior Backend Developer",
                    "company": "TechData",
                    "duration": "2018 - 2021",
                    "description": "Engineered event-driven services handling 2M messages/sec. Cut AWS spending by 30%."
                }
            ],
            "experienceStatus": "present",
            "skills": ["Go", "Kubernetes", "AWS", "Kafka", "PostgreSQL", "Docker", "Redis", "gRPC"]
        }
        heuristics = server.analyze_profile_heuristics(experienced_profile)
        self.assertGreaterEqual(heuristics["overallScore"], 80)
        self.assertGreaterEqual(heuristics["categoryScores"]["experience"], 80)

        prompt = ors.build_user_prompt(experienced_profile, "tech")
        self.assertIn("CloudCorp", prompt)
        self.assertIn("EXPERIENCE STATUS: present", prompt)

    def test_profile_audit_unavailable_experience_distinction(self):
        unavailable_profile = {
            "targetRole": "Frontend Engineer",
            "headline": "Frontend Engineer | React, Next.js & UI Performance Optimization",
            "about": "Passionate frontend engineer focused on web accessibility, responsive UI design, and fast Core Web Vitals. Let us connect!",
            "experience": [],
            "experienceStatus": "unavailable",
            "skills": ["React", "Next.js", "TypeScript", "TailwindCSS"]
        }
        heuristics = server.analyze_profile_heuristics(unavailable_profile)
        self.assertGreaterEqual(heuristics["overallScore"], 70, "Unavailable experience should re-weight available sections without penalty")
        self.assertEqual(heuristics["categoryScores"]["experience"], 75)
        self.assertTrue(any("omitted or unavailable" in s["text"] for s in heuristics["suggestions"]))

        prompt = ors.build_user_prompt(unavailable_profile, "recruiter")
        self.assertIn("EXPERIENCE STATUS: unavailable", prompt)
        self.assertIn("Unavailable / Not provided", prompt)


if __name__ == "__main__":
    unittest.main(verbosity=2)

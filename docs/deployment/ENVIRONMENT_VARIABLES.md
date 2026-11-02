# LinkedPulse — Environment Variables Reference

This document provides a comprehensive specification of all environment variables used by LinkedPulse across the backend and frontend.

---

## 1. Backend Environment Variables (`linkedin-optimizer/.env`)

| Variable | Type | Default | Required in Production? | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- |
| `ENV` | `string` | `development` | **Yes** | Execution mode. Must be set to `production` on live servers to activate security guardrails. |
| `HOST` | `string` | `0.0.0.0` | Optional | Interface to bind the server on. Use `127.0.0.1` when running behind Nginx. |
| `PORT` | `integer` | `8000` | Optional | Port on which the HTTP backend listens. |
| `FRONTEND_URL` | `string` | `http://localhost:5173` | **Yes** | Canonical origin of the frontend web application (e.g. `https://yourdomain.com`). |
| `ALLOWED_ORIGINS` | `string` | None | Optional | Comma-separated list of additional trusted origins allowed for CORS credentials. |
| `SECRET_KEY` | `string` | None | **Yes (CRITICAL)** | 256-bit cryptographic secret for AES-256-GCM token encryption and key derivation. Must be ≥ 32 chars. |
| `DATABASE_PATH` | `string` | `linkedpulse.db` | **Yes** | File path to persistent SQLite database. Should point to a mounted storage volume in containers. |
| `OPENROUTER_API_KEY` | `string` | None | **Yes** | Server-side API key for OpenRouter AI profile optimization & vision post generation. |
| `OPENROUTER_MODEL` | `string` | `openrouter/free` | Optional | Primary OpenRouter model to utilize. |
| `OPENROUTER_FALLBACK_MODELS` | `string` | Free tier router list | Optional | Comma-separated fallback models used when the primary model is throttled. |
| `LINKEDIN_CLIENT_ID` | `string` | None | Optional* | LinkedIn Developer Client ID (required for live OAuth and publishing). |
| `LINKEDIN_CLIENT_SECRET` | `string` | None | Optional* | LinkedIn Developer Client Secret. Never exposed to frontend bundles. |
| `LINKEDIN_REDIRECT_URI` | `string` | None | Optional* | Exact redirect URI registered in LinkedIn Developer Portal (e.g. `https://yourdomain.com/api/linkedin/callback`). |
| `LINKEDIN_API_VERSION` | `string` | `202610` | Optional | Active official LinkedIn REST version (`YYYYMM`). LinkedIn sunsetted `202401`. |

*\*Required if enabling live LinkedIn OAuth 2.0 connection and direct feed publishing.*

---

## 2. Frontend Environment Variables (`frontend/linkedin-post-studio/.env`)

| Variable | Type | Default | Required in Production? | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `string` | `/api` | Optional | API base URL prefix. If served behind the same domain or reverse proxy, leave `/api`. If backend is hosted on a separate subdomain (e.g., `https://api.yourdomain.com`), set to `https://api.yourdomain.com/api`. |

> [!CAUTION]
> **Zero Frontend Secrets Rule**: Never prefix backend credentials (`OPENROUTER_API_KEY`, `LINKEDIN_CLIENT_SECRET`, `SECRET_KEY`) with `VITE_`. Any variable starting with `VITE_` is compiled into static JavaScript bundles and visible to the public.

---

## 3. Secret Generation Helper Commands

To generate a cryptographically secure 64-character hex string for `SECRET_KEY`:

```bash
# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Using OpenSSL
openssl rand -hex 32
```

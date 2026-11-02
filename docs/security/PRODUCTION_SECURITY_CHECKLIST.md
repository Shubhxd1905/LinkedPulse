# LinkedPulse — Production Security Checklist

Before exposing LinkedPulse to the public internet, verify each of the following security controls.

---

## 1. Secrets & Environment Management

- [ ] **Strong `SECRET_KEY` Provisioned**: Set to a cryptographically random string (≥ 32 bytes / 64 hex characters) generated using `python3 -c "import secrets; print(secrets.token_hex(32))"`. Never use development defaults.
- [ ] **No Secrets in Frontend Bundles**: Checked `dist/` bundle to ensure no API keys or client secrets were prefixed with `VITE_` or embedded in JavaScript.
- [ ] **Git Tracking Safe**: Confirmed `.gitignore` excludes `.env`, `*.db`, `node_modules/`, and logs.
- [ ] **Environment Mode**: Configured `ENV=production` in `linkedin-optimizer/.env` to activate startup validation checks.

---

## 2. Network & Transport Layer (HTTPS)

- [ ] **SSL/TLS Active**: Reverse proxy (Nginx / Cloudflare) configured with a valid SSL/TLS certificate (e.g. Let's Encrypt).
- [ ] **HTTPS Forwarding**: Reverse proxy passes `proxy_set_header X-Forwarded-Proto $scheme;` so backend issues `Secure` cookies.
- [ ] **HTTP to HTTPS Redirection**: Plain HTTP (port 80) automatically redirects to HTTPS (port 443).
- [ ] **Firewall Configured**: Host firewall (UFW) only permits ports 22 (SSH), 80 (HTTP), and 443 (HTTPS). Backend port 8000 is bound strictly to `127.0.0.1` and blocked from external ingress.

---

## 3. Web & Application Security

- [ ] **Session Cookie Attributes**: `lp_session` cookie is configured with `HttpOnly; SameSite=Lax; Path=/; Secure`.
- [ ] **CSRF Defense**: All mutating requests (`POST`, `PUT`, `DELETE`) require `X-Requested-With: XMLHttpRequest` or `X-CSRF-Token`.
- [ ] **CORS Strictness**: Backend allowlist restricts origins strictly to `FRONTEND_URL` and `ALLOWED_ORIGINS`.
- [ ] **Rate Limiting Active**: In-memory sliding window rate limits protect AI optimization (`/api/ai/*`) and LinkedIn publishing (`/api/linkedin/publish`) from abuse.
- [ ] **Payload Limits Enforced**: Standard JSON requests restricted to 64KB; base64 image requests restricted to 10MB (`HTTP 413 Payload Too Large`).
- [ ] **SQL Injection Resistance**: 100% of database queries use parameterized SQL (`?` placeholders).

---

## 4. LinkedIn OAuth & API Compliance

- [ ] **Matching Redirect URI**: `LINKEDIN_REDIRECT_URI` matches the registered URI in the LinkedIn Developer Portal.
- [ ] **Client Secret Privacy**: `LINKEDIN_CLIENT_SECRET` remains on the backend server only.
- [ ] **Token Storage Encryption**: Stored access tokens encrypted with AES-256-GCM using keys derived from `SECRET_KEY`.
- [ ] **Version Header**: Live API calls include `LinkedIn-Version: 202610`.

---

## 5. Logging & Error Handling

- [ ] **Sanitized Logs**: Server request logging automatically redacts query parameters matching `code`, `token`, `secret`, `password`.
- [ ] **Safe Error Responses**: API errors return structured JSON with generic error messages (`"Invalid email or password."`) rather than raw Python stack traces.
- [ ] **Database File Permissions**: SQLite database file restricted with `chmod 600` accessible only by the service process user (`www-data`).

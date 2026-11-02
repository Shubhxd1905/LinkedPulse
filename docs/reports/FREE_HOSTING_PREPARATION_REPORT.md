# LinkedPulse — Free Hosting Preparation Report (₹0/Month)

**Project:** LinkedPulse — AI-Powered LinkedIn Profile & Content Optimizer  
**Hosting Architecture:** Render Free Web Service + Supabase Free PostgreSQL + GitHub + OpenRouter  
**Monthly Hosting Budget:** **₹0.00 / month (100% Free)**  
**Status:** **Deployment-Ready** (Prepared, fully audited, and tested; not published)  
**Date:** November 2026  

---

## 1. Executive Summary & ₹0 Budget Breakdown

LinkedPulse has been prepared for production hosting at a **zero-cost (₹0 / $0)** monthly budget. By taking advantage of high-reliability developer tiers across Render, Supabase, GitHub, OpenRouter, and Resend, the application achieves commercial-grade functionality with zero hosting overhead.

| Provider / Service | Role in Architecture | Free Tier Allowance | LinkedPulse Utilization | Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Render** | Unified Web Service (Python REST API + React SPA) | 750 free instance hrs/mo, 512MB RAM, shared CPU, auto-SSL | Single web service serving API & static SPA assets | **₹0.00** |
| **Supabase** | Managed PostgreSQL Database | 500MB storage, 2 projects, SSL-enforced (Manual CLI backups; auto-backups require Pro) | Relational storage for users, sessions, profiles, audits, drafts | **₹0.00** |
| **GitHub** | Source Code & Version Control | Unlimited public/private repos, Render webhooks | Continuous deployment trigger on `main` branch | **₹0.00** |
| **OpenRouter** | AI Reasoning & Vision Engine | Free tier access to 5+ top models (`openrouter/free`, `nemotron`, `gemma`) | Profile optimization, hook generation, image-to-post AI | **₹0.00** |
| **Resend** | Transactional Email Service | 3,000 emails/month (100 emails/day) over HTTPS API | Password reset token delivery | **₹0.00** |
| **Total** | **Full-Stack AI Application** | — | — | **₹0.00 / month** |

---

## 2. System Architecture

```mermaid
flowchart TD
    User([End User / Web Browser])

    subgraph RenderFreeService ["Render Free Web Service (Single Origin: https://linkedpulse.onrender.com)"]
        Server["Python Server (server.py)<br/>Port: $PORT (Binding 0.0.0.0)"]
        DistAssets["React Frontend (dist/*)<br/>SPA Router Fallback & Assets"]
        APIRoutes["REST API Handler<br/>/api/* & /health"]
    end

    subgraph ExternalFreeServices ["External Cloud Services (₹0 / Free Tier)"]
        Supabase[("Supabase PostgreSQL<br/>DATABASE_URL with SSL")]
        OpenRouter["OpenRouter AI Gateway<br/>Free-Tier Model Router"]
        LinkedIn["LinkedIn REST API<br/>OAuth 2.0 & Posting"]
        Resend["Resend Email API<br/>HTTPS Port 443"]
    end

    User -->|"HTTPS Request (Same Origin)"| Server
    Server -->|"Non-API Routes: GET /*"| DistAssets
    Server -->|"/api/* Requests"| APIRoutes
    APIRoutes -->|"Parameterized SQL"| Supabase
    APIRoutes -->|"JSON-RPC / REST"| OpenRouter
    APIRoutes -->|"OAuth / Shares"| LinkedIn
    APIRoutes -->|"Transactional HTTPS"| Resend
```

---

## 3. Database Layer: Dual-Engine & Supabase Migration

### 3.1 Dual-Engine Support (`database.py`)
To ensure smooth local development while supporting cloud deployment:
1. **SQLite Default**: When `DATABASE_URL` is absent, LinkedPulse runs on SQLite standard library (`linkedpulse.db`) with zero external pip dependencies.
2. **PostgreSQL Automatic**: When `DATABASE_URL` is provided (starting with `postgres://` or `postgresql://`), the application dynamically activates PostgreSQL with `psycopg2-binary`.
3. **Transparent Parameter Adaptation (`DualCursor`)**: SQL queries containing `?` placeholders (standard SQLite) are automatically translated to `%s` placeholders (PostgreSQL) at runtime without altering application query logic.
4. **Dictionary Row Parity**: In PostgreSQL mode, queries use `RealDictCursor` so that row index access (`row["id"]`, `row["email"]`) works identically across both database engines.
5. **Schema Parity**: Both SQLite and PostgreSQL migrations define identical schemas across all 8 tables, with type adaptations (`DOUBLE PRECISION` for timestamps, `INTEGER` for flags, and `TEXT` for JSON/UUIDs).

### 3.2 Database Schema & Table Parity

| Table Name | Primary Key | Key Indexes | Relationships & Constraints |
| :--- | :--- | :--- | :--- |
| `schema_migrations` | `version` (INT) | Primary Key | Migration version tracking |
| `users` | `id` (UUID TEXT) | `LOWER(email)` | `email UNIQUE NOT NULL` |
| `sessions` | `id` (UUID TEXT) | `token_hash`, `user_id`, `expires_at` | `user_id REFERENCES users(id) ON DELETE CASCADE` |
| `password_resets` | `id` (UUID TEXT) | `token_hash`, `user_id` | `user_id REFERENCES users(id) ON DELETE CASCADE` |
| `user_profiles` | `id` (UUID TEXT) | `user_id` | `user_id UNIQUE REFERENCES users(id) ON DELETE CASCADE` |
| `profile_audits` | `id` (UUID TEXT) | `user_id`, `created_at` | `user_id REFERENCES users(id) ON DELETE CASCADE` |
| `post_drafts` | `id` (UUID TEXT) | `user_id`, `updated_at` | `user_id REFERENCES users(id) ON DELETE CASCADE` |
| `linkedin_connections` | `id` (UUID TEXT) | `user_id`, `member_urn` | `user_id UNIQUE REFERENCES users(id) ON DELETE CASCADE` |

### 3.3 Data Migration Utility (`migrate_sqlite_to_postgres.py`)
A migration script has been built and tested to export SQLite records to Supabase PostgreSQL:
- **Idempotent Inserts**: Every table uses `ON CONFLICT (id) DO NOTHING` (or `version` for migrations). Rerunning the script is completely safe and causes zero duplicate key errors.
- **Dry-Run Preview**: Supports `--dry-run` to inspect and count records without connecting to or mutating PostgreSQL.
- **Dependency Order**: Migrates parent tables (`users`, `schema_migrations`) before child tables (`sessions`, `user_profiles`, `profile_audits`, `post_drafts`, `linkedin_connections`) to respect foreign key constraints.

### 3.4 Supabase Free Plan Backup Reality & Disaster Recovery (`supabase_backup.py`)
> [!WARNING]
> **Supabase Free Plan DOES NOT include automated daily backups or Point-in-Time Recovery (PITR)**. Automated backups are exclusive to the Supabase Pro tier ($25/mo). In addition, free projects **pause automatically after 7 days of inactivity**.

To ensure enterprise-grade disaster recovery at ₹0 cost:
1. **Manual Backup Utility (`linkedin-optimizer/supabase_backup.py`)**:
   - Executes a clean, schema-and-data dump using `pg_dump` or `supabase db dump`.
   - Command: `python linkedin-optimizer/supabase_backup.py backup --database-url "postgresql://..."`
   - Generates timestamped SQL dump files in `backups/`.
2. **Restore Procedure**:
   - Command: `python linkedin-optimizer/supabase_backup.py restore --database-url "postgresql://..." --file backups/linkedpulse_supabase_backup_<timestamp>.sql`
3. **Mandatory Off-Site Storage**:
   - Backups **must be stored separately from the Supabase project** (e.g. downloaded to local encrypted storage or external S3/Git storage).
   - If a project pauses due to 7 days of zero traffic, you can either unpause it in the Supabase Dashboard (takes 1–2 minutes) or restore the SQL dump into any new project instantly.

---

## 4. Same-Origin SPA & API Serving on Render

### 4.1 Problem Solved
Running separate frontend (e.g. Vercel/Netlify) and backend (e.g. Render) services introduces:
- Two separate hosting accounts and deployment pipelines.
- Cross-origin CORS preflight latency on every API call.
- Third-party cookie blocking issues with `SameSite=Lax` session cookies.

### 4.2 Single-Origin Solution
LinkedPulse serves both the React production bundle (`dist/*`) and the Python REST API from the **exact same origin** (`https://linkedpulse.onrender.com`):
1. **API Endpoints (`/api/*` and `/health`)**: Handled directly by `LinkedPulseHandler`.
2. **Static Assets (`/assets/*`, `/favicon.svg`)**: Served directly from `STATIC_DIR` with proper MIME types and aggressive caching (`max-age=31536000, immutable`).
3. **Client-Side SPA Routes (`/`, `/dashboard`, `/optimize`, `/post-studio`, `/drafts`, `/settings`, `/login`, `/register`, `/reset-password`)**: Any route without a file extension automatically falls back to `dist/index.html` with HTTP 200 and `no-cache` headers.
4. **Security**: Directory traversal guard ensures requests cannot escape `STATIC_DIR`.
5. **Cookies**: Session cookies work natively as first-party `SameSite=Lax` cookies, preventing any browser-level third-party cookie blocking.

---

## 5. File & Image Storage Strategy

### 5.1 Render Ephemeral Storage Analysis
Render free web services operate with ephemeral disks. Any file saved directly to disk (e.g., in `/tmp` or `./uploads`) is destroyed whenever Render spins down or restarts the container.

### 5.2 LinkedPulse Resilience
LinkedPulse does not rely on local filesystem storage for user assets:
- **Vision Model Uploads**: Analyzed in-memory via Base64 data URIs.
- **Draft Thumbnails & Media**: Stored as Base64 strings or remote URLs directly in the `image_url` column of the `post_drafts` table.
- **Database Persistence**: Because drafts and profile details live inside Supabase PostgreSQL, all image metadata, draft content, and profile audits survive Render container reboots and rebuilds.
- **Optional Growth Path**: Supabase Free Plan includes **1 GB of free Supabase Storage** (S3-compatible bucket) if file-based uploads are introduced in the future.

---

## 6. Password Reset Email Delivery on Render Free Tier

### 6.1 The Render Free Tier SMTP Restriction
Render strictly blocks outbound SMTP ports (`25`, `465`, `587`) on its free plans to prevent spambot abuse. Standard Python `smtplib` calls hang until they time out.

### 6.2 The HTTP-Based Solution (`email_service.py`)
Outbound HTTPS connections over port `443` are **completely unrestricted** on Render.
- `email_service.py` connects to **Resend's Transactional Email REST API** over port 443 using Python's standard library `urllib.request`.
- **Resend Free Plan**: 3,000 emails/month (100 emails/day), zero cost, no credit card required.
- **Fail-Safe Operation**: If `RESEND_API_KEY` is not set:
  - In *development mode*: Logs a direct recovery URL to console for developer testing.
  - In *production mode*: Logs a secure warning without leaking the reset token.

### 6.3 Resend Sender Address & Domain Verification Requirements
> [!IMPORTANT]
> **Resend Free-Tier Sending Rules**:
> 1. **Default Test Sender (`onboarding@resend.dev`)**: Before a custom domain is verified, Resend **strictly restricts delivery to the email address registered on your Resend account**. Attempting to dispatch emails to arbitrary user accounts will be rejected by Resend with HTTP 403 Forbidden.
> 2. **Production Domain Verification**: To send password reset emails to arbitrary end-users, you **must add a custom domain** (e.g. `yourdomain.com`) in the Resend dashboard and configure the required DNS records (DKIM, SPF, MX) at your DNS registrar.
> 3. **Configured From Address**: Once verified, set `EMAIL_FROM=LinkedPulse <security@yourdomain.com>` in Render environment variables.

---

## 7. Render Configuration & Deployment Specification

Two deployment configurations have been provided:

### Option A: Render Blueprint (`render.yaml`) — Recommended
```yaml
services:
  - type: web
    name: linkedpulse
    runtime: python
    plan: free
    region: oregon
    buildCommand: "cd linkedin-post-studio && npm install && npm run build && cd ../linkedin-optimizer && pip install -r requirements.txt"
    startCommand: "cd linkedin-optimizer && python server.py"
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: ENV
        value: production
      - key: PYTHON_VERSION
        value: 3.10.12
      - key: NODE_VERSION
        value: 20.11.0
      - key: STATIC_DIR
        value: ../linkedin-post-studio/dist
      - key: SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        sync: false
      - key: OPENROUTER_API_KEY
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: RESEND_API_KEY
        sync: false
```

### Option B: Containerized Build (`Dockerfile`)
A production multi-stage `Dockerfile` is present in the project root:
- **Stage 1 (Node.js 20)**: Builds Vite React bundle into `linkedin-post-studio/dist`.
- **Stage 2 (Python 3.10-slim)**: Installs `requirements.txt` and runs `server.py` on `0.0.0.0:8000`.

---

## 8. Environment Variables Reference

| Variable | Required in Prod? | Example / Placeholder | Purpose |
| :--- | :--- | :--- | :--- |
| `ENV` | Yes | `production` | Enables strict security, HTTPS cookie flags, and secret validation |
| `PORT` | Auto (Render) | `10000` | Injected automatically by Render |
| `HOST` | Auto | `0.0.0.0` | Binds server to all interfaces for container routing |
| `SECRET_KEY` | Yes | 64-char hex string | Mandatory session encryption key (min 32 bytes) |
| `DATABASE_URL` | Yes (Supabase) | `postgresql://postgres:[PW]@[HOST]:5432/postgres?sslmode=require` | Supabase PostgreSQL connection string with SSL |
| `STATIC_DIR` | Optional | `../linkedin-post-studio/dist` | Directory containing built React static bundle |
| `FRONTEND_URL` | Optional | `https://linkedpulse.onrender.com` | Base URL (defaults automatically to Render URL) |
| `OPENROUTER_API_KEY` | Optional | `sk-or-v1-...` | Enables server-side AI profile audit and post generation |
| `OPENROUTER_MODEL` | Optional | `openrouter/free` | Primary free-tier LLM |
| `RESEND_API_KEY` | Optional | `re_...` | Free transactional email key for password resets |
| `LINKEDIN_CLIENT_ID` | Optional | `77...` | Official LinkedIn OAuth 2.0 app client ID |
| `LINKEDIN_CLIENT_SECRET` | Optional | `...` | Official LinkedIn OAuth 2.0 app client secret |
| `LINKEDIN_REDIRECT_URI` | Optional | `https://linkedpulse.onrender.com/api/linkedin/callback` | OAuth callback endpoint |

---

## 9. Step-by-Step Free Deployment Checklist

Follow these exact steps when ready to deploy:

1. **GitHub Setup**:
   - Create a free GitHub repository.
   - Push project files to `main`.
   - Verify `.env`, `linkedpulse.db`, and `linkedpulse.db.bak` are excluded by `.gitignore`.

2. **Supabase Database Provisioning**:
   - Log into [supabase.com](https://supabase.com) (free plan).
   - Create a new project named `linkedpulse`.
   - In **Project Settings -> Database -> Connection string**, copy the URI under `URI` (Node.js / psycopg2 format).
   - Set password and append `?sslmode=require`.

3. **Data Migration (Optional / If migrating local data)**:
   - Run the migration script locally:
     ```bash
     python linkedin-optimizer/migrate_sqlite_to_postgres.py --database-url "postgresql://postgres:PASSWORD@HOST:5432/postgres?sslmode=require"
     ```

4. **Render Free Web Service Creation**:
   - Log into [render.com](https://render.com) (free plan).
   - Click **New -> Web Service** and connect your GitHub repository.
   - Select **Runtime: Python 3** (or use the Blueprint / Dockerfile).
   - Set Build Command:
     ```bash
     cd linkedin-post-studio && npm install && npm run build && cd ../linkedin-optimizer && pip install -r requirements.txt
     ```
   - Set Start Command:
     ```bash
     cd linkedin-optimizer && python server.py
     ```
   - In **Environment Variables**, add:
     - `ENV` = `production`
     - `DATABASE_URL` = *(Your Supabase connection string)*
     - `SECRET_KEY` = *(Generate with: `python -c "import secrets; print(secrets.token_hex(32))"`)*
     - `OPENROUTER_API_KEY` = *(Your free OpenRouter key)*
     - `STATIC_DIR` = `../linkedin-post-studio/dist`
     - `RESEND_API_KEY` = *(Optional: from resend.com)*

5. **Verify**:
   - Render will build the frontend, install python packages, and start the server.
   - Visit `https://your-service.onrender.com/health` -> returns `{"status": "healthy", "database": "connected"}`.
   - Visit `https://your-service.onrender.com/` -> loads LinkedPulse React application.

---

## 10. Verification & Test Summary

| Test Suite | Total Tests | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Unit & Integration Tests** (`test_*.py`) | 73 | 73 | 0 | **PASSED** |
| **Free Hosting Prep Tests** (`test_free_hosting_prep.py`) | 11 | 11 | 0 | **PASSED** |
| **Frontend Phase 2, 3, 4, 5 Suite** (`scripts/test*.js`) | 11 suites | 11 | 0 | **PASSED** |
| **TypeScript Type Checks** (`tsc -b`) | Complete | 0 errors | 0 | **PASSED** |
| **Vite Production Bundler** (`vite build`) | 1,641 modules | 37.73s build | 0 | **PASSED** |

### Verified Feature Invariants:
- 3 Career Pathways preserved: *Continue in Current Career*, *Transition to a New Career*, *Explore a Related Role*.
- 104 Predefined target roles + custom roles preserved.
- Image-to-post generator and draft persistence verified.
- User authentication, session management, and password reset flow verified.
- Multi-user data isolation verified.
- All secrets, tokens, and database files properly excluded from Git.

**Conclusion:** LinkedPulse is completely prepared for zero-cost hosting (₹0/month) on Render Free Web Service with Supabase Free PostgreSQL.

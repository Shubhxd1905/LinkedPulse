# LinkedPulse — AI-Powered LinkedIn Profile & Content Optimizer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend: React 19](https://img.shields.io/badge/Frontend-React_19_+_Vite-61dafb.svg)](frontend/linkedin-post-studio)
[![Backend: Python](https://img.shields.io/badge/Backend-Python_3.10+-3776ab.svg)](backend/linkedin-optimizer)
[![Package Manager: pnpm](https://img.shields.io/badge/Package_Manager-pnpm_9-f69220.svg)](https://pnpm.io)
[![Database: Dual Engine](https://img.shields.io/badge/Database-SQLite_%7C_PostgreSQL-336791.svg)](database/)
[![Tests: 75 Backend + 11 Frontend Suites](https://img.shields.io/badge/Tests-86_Suites_Passing-brightgreen.svg)](docs/reports/)

**LinkedPulse** is an enterprise-grade, full-stack web application engineered to help professionals, job seekers, and career switchers optimize their LinkedIn profiles, craft high-engagement visual post content, and publish directly to LinkedIn. Built with strict data privacy, multi-tenant isolation, cryptographically robust authentication, and zero-cost cloud architecture (Render + Supabase + OpenRouter + Resend).

---

## Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. Repository Directory Structure](#3-repository-directory-structure)
- [4. Core Features](#4-core-features)
- [5. Local Development Setup](#5-local-development-setup)
- [6. Database Architecture & Operations](#6-database-architecture--operations)
- [7. Testing & Quality Assurance](#7-testing--quality-assurance)
- [8. Production Deployment](#8-production-deployment)
- [9. Security & Data Protection](#9-security--data-protection)
- [10. Documentation Index](#10-documentation-index)
- [11. License](#11-license)

---

## 1. Architecture Overview

LinkedPulse implements a modular full-stack architecture that can be operated locally as separate processes or hosted seamlessly as a unified same-origin service on Render or inside a Docker container:

```
                                      +---------------------------------------------+
                                      |              End User Browser               |
                                      +---------------------------------------------+
                                                             |
                                           HTTPS / Cookies (Session Token)
                                                             v
+-------------------------------------------------------------------------------------------------------------------+
| LinkedPulse Unified Web Service (Render / Docker container / Local Host)                                         |
|                                                                                                                   |
|  +--------------------------------------------+         +------------------------------------------------------+  |
|  |       React 19 + Vite Frontend SPA         |         |              Python REST API Backend                 |  |
|  |      (frontend/linkedin-post-studio)       |         |            (backend/linkedin-optimizer)              |  |
|  |                                            |         |                                                      |  |
|  |  * Modern UI with Tailwind CSS & Lucide    |         |  * Pure Python http.server REST API                  |  |
|  |  * Profile Source Selector (Demo/Manual/LI)|         |  * PBKDF2-HMAC-SHA256 Auth (600,000 iterations)      |  |
|  |  * 104 Predefined Roles & 3 Career Paths   |         |  * HttpOnly, Secure, SameSite Session Management     |  |
|  |  * Visual Post Studio & Hook Swapper       |         |  * Multi-tenant Isolated Endpoints                   |  |
|  |  * Draft Persistence & State Restoration   |         |  * Dynamic Static Asset Serving (dist/)              |  |
|  +--------------------------------------------+         +------------------------------------------------------+  |
+--------------------------------------------------------------------|----------------------------------------------+
                                                                     |
                           +-----------------------------------------+-----------------------------------------+
                           |                                         |                                         |
                           v                                         v                                         v
        +-------------------------------------+   +------------------------------------+   +------------------------------------+
        |          Database Layer             |   |        AI & External APIs          |   |       Email & Notifications        |
        +-------------------------------------+   +------------------------------------+   +------------------------------------+
        | * Dev: Local SQLite                 |   | * OpenRouter Vision & Text AI      |   | * Resend API (HTTPS)               |
        |   (WAL Mode, Foreign Keys)          |   |   (Zero-Cost Free Models + Fallback|   |   (Password reset emails,          |
        | * Prod: Supabase PostgreSQL         |   | * LinkedIn OAuth 2.0 & UGC API     |   |    Local dev fallback to console)  |
        |   (Connection pooling, SSL)         |   |   (Encrypted token storage)        |   +------------------------------------+
        | * Schema Migrations Engine          |   +------------------------------------+
        +-------------------------------------+
```

---

## 2. Tech Stack

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas Confetti |
| **Backend** | Python 3.10+, `http.server`, `urllib.parse`, `hashlib`, `hmac`, `secrets`, `psycopg2-binary`, `requests` |
| **Package Management** | Corepack, pnpm 9 (`pnpm-lock.yaml` pinned) |
| **Database** | SQLite 3 (local development), PostgreSQL 15+ via Supabase (production) |
| **AI Integration** | OpenRouter Free-Tier AI (`openrouter/free`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, fallback chains) |
| **External Auth** | LinkedIn OAuth 2.0 (`openid`, `profile`, `w_member_social`, `email`) |
| **Transactional Email**| Resend HTTPS API (Transactional password reset delivery) |
| **Hosting & CI/CD** | Render Web Service (Free Tier), Multi-Stage Alpine/Slim Docker Container |

---

## 3. Repository Directory Structure

```
LinkedPulse/
├── .env.example                       # Root environment variables template
├── .gitignore                         # Multi-tier exclusion for secrets, databases & caches
├── Dockerfile                         # Production multi-stage Docker build (Corepack + pnpm + Python)
├── PRE_DEPLOYMENT_CHECKLIST.md        # Step-by-step account creation & deployment guide
├── PROJECT_STRUCTURE_AUDIT.md         # Detailed repository audit and classification report
├── README.md                          # Primary project documentation and architecture guide
├── render.yaml                        # Render Blueprint Infrastructure-as-Code specification
├── requirements.txt                   # Root Python dependencies for cloud deployment
│
├── frontend/
│   └── linkedin-post-studio/          # React + Vite TypeScript Frontend
│       ├── dist/                      # Pre-built production bundle for same-origin serving
│       ├── public/                    # Static assets (favicons, manifest)
│       ├── scripts/                   # Frontend integration & regression test suites
│       ├── src/                       # Application components, hooks, services & types
│       ├── package.json               # Frontend dependencies & scripts (pins pnpm@9.15.4)
│       ├── pnpm-lock.yaml             # Frozen pnpm dependency lockfile
│       ├── tailwind.config.ts         # Tailwind styling tokens & design system
│       └── vite.config.ts             # Vite bundler configuration & proxy routes
│
├── backend/
│   └── linkedin-optimizer/            # Python REST API Backend
│       ├── backups/                   # Automated database backups
│       ├── tests/                     # Comprehensive test suites (75 passing tests)
│       ├── auth_service.py            # PBKDF2 authentication, token hashing, session management
│       ├── database.py                # Dual-engine (SQLite & PostgreSQL) persistence layer
│       ├── email_service.py           # Resend email client with dev fallback
│       ├── linkedin_service.py        # LinkedIn OAuth 2.0 handshake & UGC post publishing
│       ├── openrouter_service.py      # AI prompt orchestration, vision fallback & model routing
│       ├── profile_optimizer.py       # Deterministic career pathway & audit scoring engine
│       ├── requirements.txt           # Backend dependencies (psycopg2-binary, requests)
│       └── server.py                  # HTTP request dispatcher, static asset router & API controllers
│
├── database/
│   ├── migrations/                    # Canonical DDL schema migrations
│   │   ├── 001_initial_schema_sqlite.sql     # SQLite schema with foreign keys & indexes
│   │   └── 001_initial_schema_postgresql.sql # PostgreSQL schema with UUIDs & timestamps
│   ├── scripts/                       # Operational utilities
│   │   ├── migrate_sqlite_to_postgres.py     # SQLite to Supabase data migration utility
│   │   └── supabase_backup.py                # Automated Supabase backup script
│   └── README.md                      # Database architecture and migration guidelines
│
├── docs/
│   ├── deployment/                    # Cloud hosting, backup & variable guides
│   │   ├── DATABASE_BACKUP_RESTORE.md # Supabase manual backup & restore runbook
│   │   ├── DEPLOYMENT_GUIDE.md        # Render & Supabase step-by-step setup
│   │   └── ENVIRONMENT_VARIABLES.md   # Complete configuration dictionary
│   ├── project/                       # Architectural notes & backend specifications
│   │   └── BACKEND_README.md          # Original backend reference
│   ├── reports/                       # Formal test & audit verification reports
│   │   ├── FINAL_DEPLOYMENT_READINESS_REPORT.md
│   │   ├── FREE_HOSTING_PREPARATION_REPORT.md
│   │   └── PHASE_9_1_VERIFICATION_REPORT.md
│   └── security/                      # Production security guidelines
│       └── PRODUCTION_SECURITY_CHECKLIST.md
│
└── archive/                           # Preserved historical prototypes & non-code artifacts
    ├── internship-eda/                # Week 1 data analysis records
    ├── legacy-cursor/                 # Early Cursor IDE prototype
    └── legacy-vanilla-frontend/       # Phase 1 vanilla HTML/JS prototype
```

---

## 4. Core Features

### 4.1 AI-Powered LinkedIn Profile Optimizer
- **104 Predefined Target Roles**: Categorized across 10 job disciplines (Engineering, AI/Data, Product, Marketing, Sales, Finance, HR, Operations, Design, Executive).
- **3 Career Pathways**:
  1. *Continue in My Current Career*: Deepen skills and optimize keywords for seniority advancement.
  2. *Transition to a New Career*: Bridge existing competencies, translate transferable skills, and address genuine gaps without fabricating experience.
  3. *Explore a Related Role*: Lateral repositioning with tailored industry keywords.
- **Profile Source Isolation**: Full multi-source support (Demo Profile, Manual Entry, and LinkedIn OAuth Fetch). Demo data is strictly isolated in temporary state and never overwrites user accounts.
- **Scoring & Honest Benchmarking**: Evaluates Headline, About Summary, Work Experience, Skills, and Social Proof against target role industry taxonomies.

### 4.2 Visual Post Studio (Image-to-Post Generation)
- **AI Vision Analysis**: Inspects uploaded infographics, charts, certificates, or screenshots and derives compelling narrative hooks, body paragraphs, and hashtags.
- **Hook Swapper**: Generates 3 alternative psychological hooks (Data/Curiosity/Contrarian) that can be swapped into the post editor with one click.
- **Draft Persistence**: Save, search, restore, and delete drafts. All drafts, visual summaries, and alternative hooks persist in the database linked to the authenticated user ID.

### 4.3 Direct LinkedIn Publishing
- **OAuth 2.0 Handshake**: Secure Authorization Code Flow with PKCE state parameter validation.
- **Media Upload Pipeline**: Multi-step LinkedIn UGC API integration (Initialize Upload -> Binary PUT -> Verification -> UGC Post Creation).
- **Security Guardrails**: Refresh token expiration tracking, client-side secret exclusion, and instant post preview links.

### 4.4 Enterprise-Grade Authentication & Isolation
- **PBKDF2-HMAC-SHA256**: 600,000 iterations with cryptographically random 16-byte salt per user.
- **Constant-Time Verification**: Prevents timing side-channel attacks via `secrets.compare_digest`.
- **Hashed Session Tokens**: Raw session cookies are never stored in the database; only SHA-256 digests are persisted.
- **Strict Cookie Security**: `HttpOnly`, `SameSite=Lax`, and `Secure` (in HTTPS production) cookies.
- **Password Reset Flow**: Cryptographically secure single-use tokens delivered via Resend API.

---

## 5. Local Development Setup

### 5.1 Prerequisites
- **Node.js**: v20.x or higher
- **pnpm**: v9.x (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- **Python**: v3.10 or higher
- **Git**

### 5.2 Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/linkedpulse.git
   cd linkedpulse
   ```

2. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example backend/linkedin-optimizer/.env
   ```
   Open `backend/linkedin-optimizer/.env` and supply:
   - `OPENROUTER_API_KEY`: (Optional) Free key from [openrouter.ai](https://openrouter.ai/keys)
   - `LINKEDIN_CLIENT_ID` & `LINKEDIN_CLIENT_SECRET`: (Optional) For LinkedIn OAuth testing
   - `SECRET_KEY`: Any secure random string (at least 32 characters)

3. **Install & Run Frontend**:
   ```bash
   cd frontend/linkedin-post-studio
   pnpm install --frozen-lockfile
   pnpm run dev
   ```
   The frontend development server starts at `http://localhost:5173`.

4. **Install & Run Backend**:
   In a new terminal window:
   ```bash
   cd backend/linkedin-optimizer
   pip install -r requirements.txt
   python server.py
   ```
   The backend API starts at `http://localhost:8000`.

5. **Access the Application**:
   Open `http://localhost:5173` in your browser. The Vite development proxy automatically forwards `/api/*` and `/health` requests to `http://localhost:8000`.

---

## 6. Database Architecture & Operations

LinkedPulse supports dual database engines through a unified, parameterized abstraction layer in `backend/linkedin-optimizer/database.py`:
- **Development**: Local SQLite (`backend/linkedin-optimizer/linkedpulse.db`) with Foreign Keys enabled and WAL mode.
- **Production**: Supabase PostgreSQL over SSL (`DATABASE_URL`).

### 6.1 Database Schema
The database maintains 8 relational tables:
1. `schema_migrations`: Version tracking.
2. `users`: User credentials and verification timestamps.
3. `sessions`: Active user sessions with SHA-256 hashed tokens and expiration dates.
4. `password_resets`: Time-limited password reset tokens.
5. `user_profiles`: Saved LinkedIn profiles, target roles, and career pathways.
6. `profile_audits`: Historical audit scores, recommendations, and missing skill analysis.
7. `post_drafts`: Saved LinkedIn post drafts, hook alternatives, and metadata.
8. `linkedin_connections`: Encrypted OAuth tokens, URN IDs, and connection status.

### 6.2 SQLite to PostgreSQL Migration
When transitioning from local development to Supabase production, execute the automated migration utility:

```bash
cd backend/linkedin-optimizer

# 1. Preview changes without writing (Dry-Run mode)
python migrate_sqlite_to_postgres.py --dry-run --db linkedpulse.db --target "postgresql://user:pass@host:5432/postgres"

# 2. Execute migration with automatic verification
python migrate_sqlite_to_postgres.py --db linkedpulse.db --target "postgresql://user:pass@host:5432/postgres"
```

### 6.3 Backup and Restore
Supabase Free tier does not include automated daily backups. Follow the documented backup procedures:
- Run the backup utility: `python database/scripts/supabase_backup.py`
- For manual CLI backups, refer to [docs/deployment/DATABASE_BACKUP_RESTORE.md](docs/deployment/DATABASE_BACKUP_RESTORE.md).

---

## 7. Testing & Quality Assurance

LinkedPulse maintains comprehensive unit, integration, security, and regression test suites.

### 7.1 Running Backend Tests
Target the backend test directory:
```bash
python -m unittest discover -s "backend/linkedin-optimizer/tests" -t "backend/linkedin-optimizer" -p "test_*.py"
```
**Status: 75/75 tests passing**
- `test_auth_suite.py`: PBKDF2 hashing, session management, password resets, rate limiting.
- `test_free_hosting_prep.py`: PostgreSQL compatibility, query parameterization, SQLite fallback.
- `test_linkedin_suite.py`: OAuth flows, error code sanitization, UGC publishing.
- `test_openrouter_suite.py`: Vision model fallbacks, rate limit retries, prompt guardrails.
- `test_production_e2e_stages1_2_3.py`: Multi-tenant user isolation, session persistence, role preservation.
- `test_server_auth_integration.py`: Cookie validation, HTTP headers, CORS.

### 7.2 Running Frontend Tests
```bash
cd frontend/linkedin-post-studio
pnpm test
```
**Status: 11/11 test suites passing**
- Profile validation, fresher preservation, career transition benchmarks.
- Hook swapper mechanics, draft CRUD, draft state restoration.
- OAuth callback parameter sanitization, publishing guardrails.

---

## 8. Production Deployment

LinkedPulse is configured for 100% free hosting using **Render** (Web Service) and **Supabase** (PostgreSQL).

### 8.1 Render Web Service (Recommended)
1. Fork or push this repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com/) and create a new **Blueprint Instance**.
3. Select this repository. Render automatically reads `render.yaml`:
   - Builds frontend with Corepack & pnpm: `pnpm run build`
   - Installs backend dependencies: `pip install -r requirements.txt`
   - Serves both frontend and backend on port `8000` via same-origin routing.
4. Set the following environment variables in the Render Dashboard:
   - `DATABASE_URL`: Your Supabase connection string.
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `SECRET_KEY`: Automatically generated by Render (or supply 32+ characters).
   - `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`: Your LinkedIn app credentials.
   - `RESEND_API_KEY`: (Optional) Free API key from [resend.com](https://resend.com) for password reset emails.

For complete step-by-step setup instructions, see [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) and [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md).

### 8.2 Docker Deployment
To run containerized locally or on any cloud host:
```bash
# Build Docker image
docker build -t linkedpulse:latest .

# Run container
docker run -p 8000:8000 \
  -e ENV=production \
  -e SECRET_KEY="your-random-production-secret-key" \
  -e DATABASE_URL="postgresql://..." \
  -e OPENROUTER_API_KEY="sk-or-v1-..." \
  linkedpulse:latest
```

---

## 9. Security & Data Protection

LinkedPulse is built following OWASP Top 10 recommendations:
1. **Password Security**: PBKDF2-HMAC-SHA256 with 600,000 iterations.
2. **Session Security**: Session tokens are cryptographically random 32-byte hex strings. Only SHA-256 hashes are stored in the database.
3. **Data Isolation**: Every profile, audit, and post draft query is parameterized and strictly scoped by `WHERE user_id = ?`.
4. **Credential Isolation**: Client applications receive connection status flags only; OAuth access tokens and secrets are never returned in API responses.
5. **Cookie Security**: `HttpOnly`, `SameSite=Lax`, and `Secure` flags prevent XSS access.
6. **SQL Injection Defense**: 100% of SQL queries use parameterized placeholders (`%s` for PostgreSQL, `?` for SQLite).

---

## 10. Documentation Index

Detailed documentation is available in the `docs/` directory:
- [Pre-Deployment Manual Checklist](PRE_DEPLOYMENT_CHECKLIST.md) — Pre-flight manual checklist for accounts & keys.
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md) — Full Render and Supabase walkthrough.
- [Environment Variables](docs/deployment/ENVIRONMENT_VARIABLES.md) — Dictionary of all configuration keys.
- [Database Backup & Restore](docs/deployment/DATABASE_BACKUP_RESTORE.md) — Manual Supabase backup guide.
- [Production Security Checklist](docs/security/PRODUCTION_SECURITY_CHECKLIST.md) — Security guardrails and validation.
- [Database Architecture & Migrations](database/README.md) — Schema, index, and migration guidelines.

---

## 11. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

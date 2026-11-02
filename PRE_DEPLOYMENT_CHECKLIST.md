# LinkedPulse — Pre-Deployment Checklist & Account Setup Guide (Phase 10 Preparation)

**Project:** LinkedPulse — AI-Powered LinkedIn Profile & Content Optimizer  
**Hosting Architecture:** Render Free Web Service + Supabase Free PostgreSQL + GitHub + OpenRouter  
**Monthly Hosting Budget:** **₹0.00 / month (100% Free)**  
**Status:** Ready for Phase 10 Execution (Code tested and audited; not deployed)  

---

## 1. Overview & Verification Status

LinkedPulse is architected to operate at enterprise quality with zero monthly hosting costs by taking advantage of generous developer tiers.

### Technical Testing Status
- **Tested against Real Local Engines**:
  - Full SQLite database operations, transactions, and foreign key cascades.
  - Lexical parameter adaptation (`adapt_sqlite_query_to_postgres`) preserving string literals, comments, and PostgreSQL JSON operators (`?|`, `?&`).
  - Same-origin static asset serving and SPA routing fallback on simulated `$PORT` and `0.0.0.0`.
  - Frontend Corepack and `pnpm` builds with `--frozen-lockfile`.
  - Quota recovery in `draftsStore.ts` and 10MB payload ceiling for image drafts.
  - Password reset token withholding in production mode.
- **Tested via Mocks & Synthetics (Local Sandbox Limitation)**:
  - Remote TLS handshake and live query execution against cloud Supabase PostgreSQL (live connection was not initiated in accordance with the rule to not create external services or deploy).
  - Outbound email dispatch via Resend REST API (requires live `RESEND_API_KEY` and verified mailbox).
  - Production LinkedIn OAuth live token refresh (requires registered LinkedIn Developer App credentials).

---

## 2. Step 1: GitHub Repository Setup (Free)

1. **Sign Up / Log In**:
   - Go to [github.com](https://github.com) and log in.
2. **Create New Repository**:
   - Click **New Repository** (+ icon).
   - Repository Name: `linkedpulse` (or your preferred name).
   - Visibility: Choose **Private** (recommended) or **Public**.
   - Do **NOT** initialize with a README, .gitignore, or license (these already exist locally).
3. **Verify Git Exclusions**:
   - Confirm that the multi-tier `.gitignore` files are present:
     - Root `.gitignore` ignores: `.env`, `*.db`, `*.db.bak`, `linkedpulse.db`, `node_modules/`, `dist/`.
     - `linkedin-optimizer/.gitignore` ignores: `.env`, `*.db`, `*.db.bak`, `linkedpulse.db`, `__pycache__/`.
4. **Push Repository**:
   ```bash
   git init
   git add .
   git commit -m "feat: LinkedPulse ready for Render & Supabase free tier deployment"
   git branch -M main
   git remote add origin https://github.com/<your-username>/linkedpulse.git
   git push -u origin main
   ```
5. **Verify on GitHub**:
   - Browse the repository in your browser.
   - Verify that `.env` and `linkedpulse.db` / `linkedpulse.db.bak` **do not appear** in the file list.

---

## 3. Step 2: Supabase Free PostgreSQL Provisioning (Free)

1. **Sign Up / Log In**:
   - Go to [supabase.com](https://supabase.com) and click **Start your project**.
   - Sign in using your GitHub account.
2. **Create a Free Project**:
   - Click **New Project**.
   - Name: `linkedpulse-production`.
   - Database Password: Create a strong password (save this securely!).
   - Region: Choose the region closest to your target audience (e.g. `East US / North Virginia` or `Central EU / Frankfurt` matches Render `oregon` or `frankfurt`).
   - Pricing Plan: Select **Free ($0/month)**.
   - Click **Create new project** (takes ~90 seconds to provision).
3. **Obtain PostgreSQL Connection String**:
   - Go to **Project Settings** (gear icon at the bottom of the left sidebar).
   - Navigate to **Database** -> **Connection string**.
   - Select the **URI** tab.
   - Copy the URI. It will look like:
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with the actual database password you created in step 2.
   - Append `?sslmode=require` to the end of the URL.
4. **Run Data Migration (Optional)**:
   - If you have existing local user accounts or drafts in `linkedpulse.db` to migrate:
     ```bash
     python linkedin-optimizer/migrate_sqlite_to_postgres.py --database-url "postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres?sslmode=require"
     ```
   - (If starting with a clean production database, LinkedPulse will automatically create all tables on first startup via `database.init_db()`).
5. **Supabase Inactivity & Backup Notes**:
   - **7-Day Inactivity Rule**: Supabase Free projects pause after 7 consecutive days of zero traffic. If paused, click **Restore project** in the dashboard.
   - **No Automated Backups on Free Tier**: To backup your database periodically, run:
     ```bash
     python linkedin-optimizer/supabase_backup.py backup --database-url "postgresql://..."
     ```
   - Store SQL dump files in an off-site, secure location external to Supabase.

---

## 4. Step 3: OpenRouter Free AI Setup (Free)

1. **Sign Up**:
   - Go to [openrouter.ai](https://openrouter.ai).
   - Sign up with Google, GitHub, or email.
2. **Create API Key**:
   - Navigate to **Settings** -> **Keys**.
   - Click **Create Key**.
   - Name: `LinkedPulse Production`.
   - Credit limit: Leave empty (or set $0) since LinkedPulse uses free models.
   - Copy the key (`sk-or-v1-...`).
3. **Free Models Configured**:
   - Primary: `openrouter/free`
   - Fallbacks: `nvidia/nemotron-3.5-lightning:free`, `google/gemma-4-31b-it:free`, `liquid/lfm-2.5-2.6b:free`.

---

## 5. Step 4: Resend Free Email Setup (Optional / Password Resets)

1. **Sign Up**:
   - Go to [resend.com](https://resend.com).
   - Sign up for the Free Plan (3,000 emails/month, 100/day).
2. **Create API Key**:
   - Navigate to **API Keys** -> **Create API Key**.
   - Name: `LinkedPulse Email`.
   - Permission: **Full access** (or sending access).
   - Copy the key (`re_...`).
3. **Domain Verification**:
   - *Test mode*: If you do not verify a domain, you can only send test emails to your own registered Resend email address.
   - *Production mode*: Go to **Domains** -> **Add Domain** (e.g. `mail.yourdomain.com`), and copy the DNS records (DKIM, SPF, MX) to your DNS provider (e.g. Cloudflare, Namecheap, GoDaddy).
   - Once verified, configure `EMAIL_FROM=LinkedPulse <noreply@yourdomain.com>`.

---

## 6. Step 5: Render Free Web Service Deployment (Free)

1. **Sign Up / Log In**:
   - Go to [render.com](https://render.com) and log in using GitHub.
2. **Create Web Service**:
   - Click **New +** -> **Web Service**.
   - Select **Build and deploy from a Git repository**.
   - Connect your `linkedpulse` repository.
3. **Configure Service Settings**:
   - **Name**: `linkedpulse` (will give you `https://linkedpulse.onrender.com`).
   - **Region**: `Oregon (US West)` (or closest to your Supabase region).
   - **Branch**: `main`.
   - **Runtime**: `Python 3`.
   - **Build Command**:
     ```bash
     cd frontend/linkedin-post-studio && corepack enable && pnpm install --frozen-lockfile && pnpm run build && cd ../../backend/linkedin-optimizer && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd backend/linkedin-optimizer && python server.py
     ```
   - **Instance Type**: Select **Free** ($0/month).
4. **Configure Environment Variables**:
   Click **Advanced** -> **Add Environment Variable** and add the following:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `ENV` | `production` | Enables production security mode |
   | `SECRET_KEY` | *(Generate 64-char hex)* | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `DATABASE_URL` | `postgresql://postgres:...@...:5432/postgres?sslmode=require` | Your Supabase connection string from Step 2 |
   | `STATIC_DIR` | `../../frontend/linkedin-post-studio/dist` | Points to built React SPA |
   | `OPENROUTER_API_KEY` | `sk-or-v1-...` | Your free OpenRouter key from Step 3 |
   | `OPENROUTER_MODEL` | `openrouter/free` | Uses free-tier router |
   | `RESEND_API_KEY` | `re_...` | (Optional) Your Resend key from Step 4 |
   | `EMAIL_FROM` | `LinkedPulse <onboarding@resend.dev>` | Or your verified custom domain email |
   | `FRONTEND_URL` | `https://linkedpulse.onrender.com` | (Optional: automatically resolved from Render URL) |

5. **Set Health Check Path**:
   - In **Advanced Settings**, set **Health Check Path** to `/health`.
6. **Deploy**:
   - Click **Create Web Service**.
   - Render will trigger the build pipeline:
     1. Runs Corepack and installs pnpm packages via `pnpm-lock.yaml`.
     2. Runs TypeScript checks and Vite production build.
     3. Installs `psycopg2-binary` and `requests`.
     4. Starts `python server.py`.

---

## 7. Step 6: Post-Deployment Verification (Smoke Test)

Once Render finishes deploying (marked as `Live`):

1. **Verify Health Endpoint**:
   - Open: `https://<your-service>.onrender.com/health`
   - Expect:
     ```json
     {
       "status": "healthy",
       "database": "connected",
       "version": "1.0.0",
       "environment": "production"
     }
     ```
2. **Verify Frontend SPA**:
   - Open: `https://<your-service>.onrender.com/`
   - Expect: LinkedPulse landing / onboarding page renders with all CSS and icons intact.
3. **Verify Protected Routes**:
   - Navigate to `/login`, `/register`, `/optimize`, `/post-studio`, `/drafts`, `/settings`.
   - Verify page transitions work smoothly without 404 errors.
4. **Verify Authentication & Database Persistence**:
   - Register a new account at `/register`.
   - Verify registration succeeds and redirects to `/dashboard`.
   - Perform a profile audit with one of the 3 career pathways:
     1. *Continue in My Current Career*
     2. *Transition to a New Career*
     3. *Explore a Related Role*
   - Save a post draft with image in Post Studio.
   - Refresh the page and confirm the draft persists.
   - Log out and log back in to verify session persistence.

---

## 8. Summary Checklist Before Initiating Phase 10

- [x] Pnpm Corepack standardized in `render.yaml` and `Dockerfile`.
- [x] Zero competing lockfiles generated (`pnpm-lock.yaml` preserved).
- [x] SQLite backup file `linkedin-optimizer/linkedpulse.db.bak` exists.
- [x] Database files (`*.db`, `*.db.bak`) strictly excluded from Git.
- [x] `.env` files and production credentials excluded from Git.
- [x] Zero hardcoded API keys or secrets in source code.
- [x] Render paths, Docker paths, and static directory resolution verified.
- [x] Ephemeral filesystem resilience verified (drafts/images in PostgreSQL).
- [x] 75 backend tests passing.
- [x] 11 frontend test suites passing.
- [x] TypeScript compiler checks clean (0 errors).
- [x] Production build generated in `dist/`.
- [x] No deployment or publishing was performed.

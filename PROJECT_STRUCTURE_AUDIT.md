# LinkedPulse — Complete Project Structure Audit (Phase 1)

**Project:** LinkedPulse — AI-Powered LinkedIn Profile & Content Optimizer  
**Auditor:** Senior Software Architect & Repository Maintenance Engineer  
**Date:** November 2026  
**Status:** Audit Complete  

---

## 1. Executive Summary

A comprehensive, recursive audit of the entire LinkedPulse repository was conducted. The project is an end-to-end full-stack TypeScript (React + Vite) and Python application providing AI LinkedIn profile audits, career pathway transitions, viral post generation, and drafts persistence with SQLite and PostgreSQL dual-engine support.

The audit revealed:
1. **Active Core Components**:
   - Frontend: Modern React 19 + Vite + Tailwind CSS application (`linkedin-post-studio`).
   - Backend: Robust, secure Python REST API (`linkedin-optimizer/server.py`) with PBKDF2 authentication, dual-engine PostgreSQL/SQLite database layer, OpenRouter AI integration, and Resend transactional email over HTTPS.
2. **Legacy & Unrelated Artifacts**:
   - Phase 1 legacy vanilla JS prototype files (`app.js`, `index.html`, `styles.css`, `start.bat` in `linkedin-optimizer`).
   - Old experimental Cursor IDE prototype (`Cursor/`).
   - Non-project internship files from Week 1 EDA on Delhi Metro (`DELHI METRO EDA.pdf`, `.pptx`, `.csv`, `.docx`).
3. **Documentation Spread**:
   - 8 markdown guides and reports scattered across the root directory.
4. **Transient Files**:
   - Python `__pycache__/` bytecode caches.

---

## 2. Comprehensive Inventory & Classification

Every file and directory in the project has been inspected and classified under the 5 mandated categories:
- **KEEP**: Required by the active application, tests, or deployment.
- **MOVE**: Active file that belongs in a more appropriate directory structure.
- **ARCHIVE**: Historical, prototype, or personal reference files preserved without cluttering active project code.
- **DELETE**: Conclusively unnecessary transient files (e.g. bytecode caches).
- **REVIEW**: Files requiring explicit note or special care.

### 2.1 Root Directory Files

| File / Folder | Size / Type | Classification | Reason & Planned Action |
| :--- | :--- | :--- | :--- |
| `linkedin-post-studio/` | Directory | **MOVE** | Active React application; move to `frontend/linkedin-post-studio/`. |
| `linkedin-optimizer/` | Directory | **MOVE** | Active Python backend; move to `backend/linkedin-optimizer/`. |
| `render.yaml` | 1,326 B (YAML) | **KEEP** | Render Blueprint deployment specification; keep at root and mirror in `deployment/`. |
| `Dockerfile` | 1,189 B (Dockerfile) | **KEEP** | Production multi-stage Docker build; keep at root and mirror in `deployment/`. |
| `requirements.txt` | 72 B (Text) | **KEEP** | Root Python dependencies (`psycopg2-binary`, `requests`); keep at root. |
| `.env.example` | 490 B (Text) | **KEEP** | Root environment variables template for production deployment. |
| `.gitignore` | 422 B (Text) | **KEEP** | Multi-tier git exclusion rules protecting secrets and databases. |
| `README.md` | Markdown | **KEEP** | Main repository landing documentation; expand and polish. |
| `PRE_DEPLOYMENT_CHECKLIST.md` | 11,540 B (Markdown) | **KEEP** | Manual cloud account setup guide; keep at root and link in `docs/deployment/`. |
| `DATABASE_BACKUP_RESTORE.md` | 4,157 B (Markdown) | **MOVE** | Move to `docs/deployment/DATABASE_BACKUP_RESTORE.md`. |
| `DEPLOYMENT_GUIDE.md` | 6,212 B (Markdown) | **MOVE** | Move to `docs/deployment/DEPLOYMENT_GUIDE.md`. |
| `ENVIRONMENT_VARIABLES.md` | 3,363 B (Markdown) | **MOVE** | Move to `docs/deployment/ENVIRONMENT_VARIABLES.md`. |
| `PRODUCTION_SECURITY_CHECKLIST.md` | 3,178 B (Markdown) | **MOVE** | Move to `docs/security/PRODUCTION_SECURITY_CHECKLIST.md`. |
| `FINAL_DEPLOYMENT_READINESS_REPORT.md`| 11,363 B (Markdown) | **MOVE** | Move to `docs/reports/FINAL_DEPLOYMENT_READINESS_REPORT.md`. |
| `FREE_HOSTING_PREPARATION_REPORT.md` | 12,850 B (Markdown) | **MOVE** | Move to `docs/reports/FREE_HOSTING_PREPARATION_REPORT.md`. |
| `PHASE_9_1_VERIFICATION_REPORT.md` | 12,120 B (Markdown) | **MOVE** | Move to `docs/reports/PHASE_9_1_VERIFICATION_REPORT.md`. |
| `DELHI METRO EDA.pdf` | 66.4 MB (PDF) | **ARCHIVE** | Personal internship Week 1 EDA report; move to `archive/internship-eda/`. |
| `DELHI METRO EDA.pptx` | 29.2 MB (PPTX) | **ARCHIVE** | Personal internship presentation; move to `archive/internship-eda/`. |
| `DELHI_METRO_DATA.csv` | 11.2 KB (CSV) | **ARCHIVE** | Personal internship dataset; move to `archive/internship-eda/`. |
| `Week_1_Internship_Project_Planner_...` | 37.0 KB (DOCX) | **ARCHIVE** | Personal internship project planner; move to `archive/internship-eda/`. |
| `Cursor/` | Directory | **ARCHIVE** | Legacy Cursor IDE prototype workspace; move to `archive/legacy-cursor/`. |
| `__pycache__/` | Directory | **DELETE** | Root Python bytecode cache; safe to remove. |

### 2.2 Backend (`linkedin-optimizer/`)

| File / Folder | Classification | Reason & Planned Action |
| :--- | :--- | :--- |
| `server.py` | **KEEP** | Core backend HTTP REST server and same-origin static/SPA file server. |
| `database.py` | **KEEP** | Dual-engine database layer (SQLite & Supabase PostgreSQL) with lexical parameter parser. |
| `auth_service.py` | **KEEP** | PBKDF2 authentication engine, session management, CSRF validation. |
| `email_service.py` | **KEEP** | Resend HTTPS API client for password resets. |
| `openrouter_service.py` | **KEEP** | OpenRouter free model AI integration and vision analysis. |
| `linkedin_service.py` | **KEEP** | LinkedIn OAuth 2.0 flow and REST API v202610 publishing. |
| `profile_optimizer.py` | **KEEP** | Heuristic fallback profile optimization engine. |
| `database.json` | **KEEP** | Legacy recommendations fallback store. |
| `requirements.txt` | **KEEP** | Backend Python dependencies (`psycopg2-binary`, `requests`). |
| `.env.example` | **KEEP** | Detailed backend environment variables template. |
| `.env` | **REVIEW / KEEP** | Local development credentials; preserved and strictly excluded by `.gitignore`. |
| `linkedpulse.db` | **REVIEW / KEEP** | Active SQLite database; preserved and strictly excluded by `.gitignore`. |
| `linkedpulse.db.bak` | **REVIEW / KEEP** | Safe SQLite backup; preserved and strictly excluded by `.gitignore`. |
| `migrate_sqlite_to_postgres.py` | **MOVE** | Move to `database/scripts/migrate_sqlite_to_postgres.py` (with proxy in backend). |
| `supabase_backup.py` | **MOVE** | Move to `database/scripts/supabase_backup.py` (with proxy in backend). |
| `test_auth_suite.py` | **MOVE** | Move to `backend/linkedin-optimizer/tests/test_auth_suite.py`. |
| `test_linkedin_suite.py` | **MOVE** | Move to `backend/linkedin-optimizer/tests/test_linkedin_suite.py`. |
| `test_openrouter_suite.py` | **MOVE** | Move to `backend/linkedin-optimizer/tests/test_openrouter_suite.py`. |
| `test_production_e2e_stages1_2_3.py`| **MOVE** | Move to `backend/linkedin-optimizer/tests/test_production_e2e_stages1_2_3.py`. |
| `test_server_auth_integration.py` | **MOVE** | Move to `backend/linkedin-optimizer/tests/test_server_auth_integration.py`. |
| `test_free_hosting_prep.py` | **MOVE** | Move to `backend/linkedin-optimizer/tests/test_free_hosting_prep.py`. |
| `app.js` | **ARCHIVE** | Phase 1 vanilla JS prototype; move to `archive/legacy-vanilla-frontend/`. |
| `index.html` | **ARCHIVE** | Phase 1 vanilla HTML prototype; move to `archive/legacy-vanilla-frontend/`. |
| `styles.css` | **ARCHIVE** | Phase 1 vanilla CSS stylesheet; move to `archive/legacy-vanilla-frontend/`. |
| `start.bat` | **ARCHIVE** | Phase 1 Windows launcher; move to `archive/legacy-vanilla-frontend/`. |
| `README.md` | **MOVE** | Move to `docs/project/BACKEND_README.md`. |
| `__pycache__/` | **DELETE** | Transient Python bytecode cache. |

### 2.3 Frontend (`linkedin-post-studio/`)

All files in `linkedin-post-studio` represent active application source code, configuration, or test scripts.
- `package.json`: **KEEP** (specifies `"packageManager": "pnpm@9.15.4"`).
- `pnpm-lock.yaml`: **KEEP** (standard lockfile v9.0; must not be replaced).
- `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`: **KEEP**.
- `src/` (components, pages, hooks, lib, styles, types): **KEEP**.
- `public/`: **KEEP**.
- `scripts/` (`testProfileOptimizer.js`, `testPostStudio.js`, `testLinkedInPublish.js`): **KEEP**.
- `dist/`: **KEEP** (active production build).

---

## 3. Planned Target Directory Layout

```text
LinkedPulse/
├── frontend/
│   └── linkedin-post-studio/
│       ├── public/
│       ├── src/
│       ├── scripts/
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       └── vite.config.ts
│
├── backend/
│   └── linkedin-optimizer/
│       ├── server.py
│       ├── database.py
│       ├── auth_service.py
│       ├── email_service.py
│       ├── openrouter_service.py
│       ├── linkedin_service.py
│       ├── profile_optimizer.py
│       ├── database.json
│       ├── requirements.txt
│       ├── .env.example
│       ├── .gitignore
│       └── tests/
│           ├── test_auth_suite.py
│           ├── test_linkedin_suite.py
│           ├── test_openrouter_suite.py
│           ├── test_production_e2e_stages1_2_3.py
│           ├── test_server_auth_integration.py
│           └── test_free_hosting_prep.py
│
├── database/
│   ├── migrations/
│   ├── scripts/
│   │   ├── migrate_sqlite_to_postgres.py
│   │   └── supabase_backup.py
│   └── README.md
│
├── docs/
│   ├── project/
│   │   └── BACKEND_README.md
│   ├── deployment/
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── ENVIRONMENT_VARIABLES.md
│   │   └── DATABASE_BACKUP_RESTORE.md
│   ├── security/
│   │   └── PRODUCTION_SECURITY_CHECKLIST.md
│   └── reports/
│       ├── FINAL_DEPLOYMENT_READINESS_REPORT.md
│       ├── FREE_HOSTING_PREPARATION_REPORT.md
│       └── PHASE_9_1_VERIFICATION_REPORT.md
│
├── deployment/
│   ├── Dockerfile
│   └── render.yaml
│
├── archive/
│   ├── internship-eda/
│   │   ├── DELHI METRO EDA.pdf
│   │   ├── DELHI METRO EDA.pptx
│   │   ├── DELHI_METRO_DATA.csv
│   │   └── Week_1_Internship_Project_Planner_Metro_EDA.docx
│   ├── legacy-cursor/
│   └── legacy-vanilla-frontend/
│       ├── app.js
│       ├── index.html
│       ├── styles.css
│       └── start.bat
│
├── .gitignore
├── requirements.txt
├── render.yaml
├── Dockerfile
├── PRE_DEPLOYMENT_CHECKLIST.md
├── PROJECT_STRUCTURE_AUDIT.md
└── README.md
```

---

## 4. Verification & Safeguards Before File Movement

1. **Database Safety**: `linkedpulse.db` and `linkedpulse.db.bak` remain inside `backend/linkedin-optimizer/` and are strictly excluded from git.
2. **Path Resilience in `server.py`**: Static asset resolution in `server.py` checks both `frontend/linkedin-post-studio/dist` and `linkedin-post-studio/dist` seamlessly.
3. **Test Discovery**: All backend test suites include dual-tier `sys.path` resolution to load modules whether invoked from `tests/`, `backend/linkedin-optimizer/`, or the repository root.
4. **Pnpm Lockfile**: `pnpm-lock.yaml` is strictly preserved and enforced with `corepack` and `--frozen-lockfile`.

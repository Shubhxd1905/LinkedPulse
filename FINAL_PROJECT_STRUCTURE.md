# LinkedPulse — Final Project Structure (Phase 8)

**Project:** LinkedPulse — AI-Powered LinkedIn Profile & Content Optimizer  
**Architecture:** Full-Stack React 19 (Vite) + Python REST API with Dual Database Support (SQLite/Supabase PostgreSQL)  
**Status:** Cleaned, Reorganized, Verified & Production-Ready  

---

## 1. Directory Tree Overview

```
LinkedPulse/
│
├── .env.example                               # Global environment configuration template
├── .gitignore                                 # Git exclusions (protects .env, databases, node_modules)
├── Dockerfile                                 # Multi-stage production container build (pnpm + Python)
├── LICENSE                                    # MIT Open Source License
├── PRE_DEPLOYMENT_CHECKLIST.md                # Pre-flight manual checklist for accounts & keys
├── PROJECT_CLEANUP_REPORT.md                  # Comprehensive refactoring and cleanup report
├── PROJECT_STRUCTURE_AUDIT.md                 # Detailed repository audit and classification
├── FINAL_PROJECT_STRUCTURE.md                 # This structural map and directory inventory
├── README.md                                  # Primary repository landing and architecture guide
├── render.yaml                                # Render Blueprint Infrastructure-as-Code specification
├── requirements.txt                           # Root Python deployment dependencies
│
├── frontend/                                  # Active Frontend Application
│   └── linkedin-post-studio/                  # React 19 + Vite + Tailwind CSS Single Page Application
│       ├── dist/                              # Pre-built production bundle for same-origin serving
│       │   ├── assets/                        # Minified JS, CSS, and media bundles
│       │   ├── _redirects                     # SPA routing redirect rule
│       │   ├── favicon.svg                    # Brand SVG icon
│       │   └── index.html                     # Production HTML entry point
│       ├── public/                            # Static assets served as-is
│       │   └── favicon.svg                    # Application favicon
│       ├── scripts/                           # Frontend automated test scripts
│       │   ├── testLinkedInPublish.js         # OAuth callback & UGC publishing test suite
│       │   ├── testPostStudio.js              # Hook replacement & draft persistence test suite
│       │   └── testProfileOptimizer.js        # 104 roles, 3 pathways & profile audit test suite
│       ├── src/                               # Frontend source code
│       │   ├── assets/                        # React SVG icons and component images
│       │   ├── components/                    # UI Components (Profile, Post Studio, Auth, Nav)
│       │   ├── context/                       # React Contexts (AuthContext, ProfileContext)
│       │   ├── hooks/                         # Custom React hooks
│       │   ├── lib/                           # Utility libraries and API clients
│       │   ├── services/                      # API service clients (auth, drafts, profile, linkedin)
│       │   ├── types/                         # TypeScript interfaces and type definitions
│       │   ├── App.tsx                        # Main application component & routes
│       │   ├── index.css                      # Tailwind CSS root stylesheet
│       │   └── main.tsx                       # React DOM entry point
│       ├── .env.example                       # Frontend local environment template
│       ├── .gitignore                         # Frontend-specific git exclusion rules
│       ├── index.html                         # Vite development HTML entry point
│       ├── package.json                       # Package metadata & scripts (pins pnpm@9.15.4)
│       ├── pnpm-lock.yaml                     # Frozen pnpm dependency lockfile
│       ├── pnpm-workspace.yaml                # pnpm workspace configuration
│       ├── postcss.config.js                  # PostCSS plugin configuration
│       ├── tailwind.config.ts                 # Tailwind CSS styling and theme design tokens
│       ├── tsconfig.json                      # TypeScript compiler configuration
│       └── vite.config.ts                     # Vite bundler configuration & local API proxy
│
├── backend/                                   # Active Backend Application
│   └── linkedin-optimizer/                    # Python REST API Server & AI Services
│       ├── backups/                           # Local database backup storage
│       ├── tests/                             # Comprehensive test suites (75/75 passing)
│       │   ├── __init__.py                    # Test package marker
│       │   ├── test_auth_suite.py             # PBKDF2 hashing, sessions & password reset tests
│       │   ├── test_free_hosting_prep.py      # PostgreSQL query compatibility & backup tests
│       │   ├── test_linkedin_suite.py         # LinkedIn OAuth 2.0 & UGC publishing tests
│       │   ├── test_openrouter_suite.py       # OpenRouter AI vision & fallback tests
│       │   ├── test_production_e2e_stages1_2_3.py # Multi-user isolation & audit tests
│       │   └── test_server_auth_integration.py# HTTP cookies, CORS & header tests
│       ├── .env                               # Local environment variables (Ignored by Git)
│       ├── .env.example                       # Backend environment template
│       ├── .gitignore                         # Backend-specific git exclusion rules
│       ├── auth_service.py                    # PBKDF2 authentication & session management engine
│       ├── database.json                      # Local development database metadata
│       ├── database.py                        # Dual-engine persistence layer (SQLite & PostgreSQL)
│       ├── email_service.py                   # Resend API email client with dev fallback
│       ├── linkedin_service.py                # LinkedIn OAuth 2.0 handshake & UGC publishing
│       ├── linkedpulse.db                     # Local SQLite database (Ignored by Git)
│       ├── linkedpulse.db.bak                 # Local SQLite database backup (Ignored by Git)
│       ├── migrate_sqlite_to_postgres.py      # SQLite to PostgreSQL data migration utility
│       ├── openrouter_service.py              # OpenRouter AI prompt orchestration & model fallback
│       ├── profile_optimizer.py               # Deterministic career pathway & audit scoring engine
│       ├── requirements.txt                   # Backend dependencies (psycopg2-binary, requests)
│       ├── server.py                          # Unified HTTP server, REST API & static file router
│       └── supabase_backup.py                 # Automated Supabase database backup script
│
├── database/                                  # Database Migrations & Operational Utilities
│   ├── migrations/                            # Canonical DDL Schema Migrations
│   │   ├── 001_initial_schema_sqlite.sql      # SQLite initial schema with foreign keys & indexes
│   │   └── 001_initial_schema_postgresql.sql  # PostgreSQL initial schema with UUIDs & indexes
│   ├── scripts/                               # Standalone database operations
│   │   ├── migrate_sqlite_to_postgres.py      # Dual-mode data migration script (Dry-run & Live)
│   │   └── supabase_backup.py                 # Supabase automated backup utility
│   └── README.md                              # Database architecture & migration guidelines
│
├── deployment/                                # Mirrored Deployment Configurations
│   ├── Dockerfile                             # Production multi-stage Docker build
│   └── render.yaml                            # Render Blueprint Infrastructure-as-Code
│
├── docs/                                      # Project Documentation & Verification Reports
│   ├── deployment/                            # Cloud hosting and operational guides
│   │   ├── DATABASE_BACKUP_RESTORE.md         # Supabase manual backup and restore runbook
│   │   ├── DEPLOYMENT_GUIDE.md                # Complete Render & Supabase hosting guide
│   │   └── ENVIRONMENT_VARIABLES.md           # Environment variables reference table
│   ├── project/                               # Architecture and background specifications
│   │   └── BACKEND_README.md                  # Backend system reference
│   ├── reports/                               # Verification and audit documentation
│   │   ├── FINAL_DEPLOYMENT_READINESS_REPORT.md # Deployment readiness audit
│   │   ├── FREE_HOSTING_PREPARATION_REPORT.md   # Free-tier hosting architecture review
│   │   └── PHASE_9_1_VERIFICATION_REPORT.md     # Pre-cleanup verification report
│   └── security/                              # Security and privacy documentation
│       └── PRODUCTION_SECURITY_CHECKLIST.md   # OWASP & production security checklist
│
└── archive/                                   # Preserved Historical & Prototype Materials
    ├── internship-eda/                        # Week 1 data analysis records
    ├── legacy-cursor/                         # Early experimental Cursor IDE project files
    └── legacy-vanilla-frontend/               # Phase 1 vanilla HTML/JS/CSS prototype
        ├── app.js                             # Vanilla JS frontend client
        ├── index.html                         # Vanilla HTML landing page
        ├── start.bat                          # Local Windows startup batch script
        └── styles.css                         # Vanilla CSS stylesheet
```

---

## 2. Directory Breakdown & Architectural Roles

### 2.1 Root (`/`)
The root directory acts as the central command center and entry point for developer onboarding, Git tracking, continuous integration, and cloud platform build detection.
- **Key Files**:
  - `README.md`: The primary landing page and technical documentation.
  - `render.yaml`: Automatically detected by Render when launching via Infrastructure-as-Code Blueprint.
  - `Dockerfile`: Automatically detected by Docker-based PaaS providers or local container workflows.
  - `requirements.txt`: Root-level Python dependency specification.
  - `.gitignore`: Enforces strict exclusion of environment secrets (`.env`), database files (`*.db`), dependencies (`node_modules`), and caches (`__pycache__`).

### 2.2 Frontend (`frontend/linkedin-post-studio/`)
Contains the user-facing web application built with modern React 19, TypeScript, and Vite.
- **Role**:
  - Provides the interactive UI for LinkedIn Profile Optimization, Visual Post Studio, Drafts Management, and Authentication.
  - Communicates with the backend REST API via relative `/api/*` endpoints.
  - Configured with `dist/` pre-built bundle for zero-configuration local and production same-origin serving.
  - Standardized on `pnpm` with `pnpm-lock.yaml` pinned to `pnpm@9.15.4`.

### 2.3 Backend (`backend/linkedin-optimizer/`)
Contains the Python application server, REST API endpoints, business logic, authentication engine, and external service integrations.
- **Role**:
  - Pure Python `http.server` running without bloated heavyweight dependencies.
  - Dynamic static asset serving (`_resolve_static_dir()`) enabling same-origin hosting on Render.
  - Cryptographically secure PBKDF2 authentication with 600,000 iterations and constant-time comparison.
  - Dual-engine database persistence (SQLite for dev, Supabase PostgreSQL for prod).
  - OpenRouter AI integration with automatic vision model fallback and rate limit retries.
  - LinkedIn OAuth 2.0 and UGC publishing pipeline.
  - Houses 75 comprehensive automated unit and integration tests under `tests/`.

### 2.4 Database (`database/`)
Centralizes all schema migrations, migration scripts, and backup utilities.
- **Role**:
  - `migrations/`: Canonical SQL DDL scripts for both SQLite and PostgreSQL.
  - `scripts/`: Data migration utility (`migrate_sqlite_to_postgres.py`) and backup automation (`supabase_backup.py`).
  - `README.md`: Reference documentation explaining table relationships, schema versioning, and backup procedures.

### 2.5 Deployment (`deployment/`)
Maintains mirrored deployment specifications for team reference, container orchestration, and cloud staging.
- **Role**:
  - Provides duplicate copies of `Dockerfile` and `render.yaml` alongside root files for architectural modularity.

### 2.6 Documentation (`docs/`)
Structured repository documentation categorized into four specialized domains:
- **`deployment/`**: Cloud hosting setup, database backup/restore procedures, and environment variables.
- **`project/`**: Technical specifications and historical backend documentation.
- **`reports/`**: Formal testing, audit, and readiness reports.
- **`security/`**: Production security checklists and OWASP compliance guidelines.

### 2.7 Archive (`archive/`)
Preserves historical prototypes, early proof-of-concept implementations, and non-project internship coursework without cluttering active application code:
- **`internship-eda/`**: Week 1 Delhi Metro exploratory data analysis.
- **`legacy-cursor/`**: Early Cursor IDE experimental configuration.
- **`legacy-vanilla-frontend/`**: Phase 1 vanilla HTML, CSS, and JS prototype files.

---

## 3. Verification & Compliance Confirmation

| Standard / Requirement | Status | Evidence |
| :--- | :--- | :--- |
| **Active Frontend Location** | `frontend/linkedin-post-studio` | Populated, tests passing (11/11), `dist/` built |
| **Active Backend Location** | `backend/linkedin-optimizer` | Populated, tests passing (75/75 in `tests/`) |
| **Package Manager** | `pnpm` pinned to `9.15.4` | `pnpm-lock.yaml` intact, Corepack enabled in builds |
| **Database Safety** | `linkedpulse.db` & `*.bak` safe | Excluded from Git, preserved in `backend/` |
| **Static Asset Resolution** | Dynamic in `server.py` | Handles `../../frontend/linkedin-post-studio/dist` & containers |
| **Cloud Deployment Paths** | Render & Docker updated | Both reference new `frontend/` and `backend/` paths |
| **Zero Feature Regression** | Confirmed | 104 roles, 3 pathways, drafts, AI, auth intact |

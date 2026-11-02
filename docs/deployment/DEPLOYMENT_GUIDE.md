# LinkedPulse — Production Deployment Guide

This guide provides step-by-step, beginner-friendly instructions to deploy LinkedPulse to a production server (Ubuntu/Debian VPS, Docker, or Cloud PaaS).

---

## 1. System Architecture Overview

LinkedPulse is composed of two primary layers:
1. **Frontend**: React + Vite + TypeScript Single Page Application (SPA), compiling into static assets (`dist/`).
2. **Backend**: Python 3.10+ lightweight REST server (`linkedin-optimizer/server.py`) using SQLite with Write-Ahead Logging (`WAL`), PBKDF2 authentication, and AES-256-GCM token encryption.

In production, both can be served behind a single **Nginx reverse proxy** with SSL/TLS encryption.

---

## 2. Server Prerequisites

On your production server (e.g., Ubuntu 22.04 LTS):

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Python 3, pip, venv, and SQLite
sudo apt install -y python3 python3-pip python3-venv sqlite3

# Install Node.js 20 LTS (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx and Certbot (for SSL)
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 3. Clone Repository & Setup Directories

```bash
# Create application root directory
sudo mkdir -p /var/www/linkedpulse
sudo chown -R $USER:$USER /var/www/linkedpulse

# Clone repository into folder
cd /var/www/linkedpulse
git clone <YOUR_REPOSITORY_URL> .
```

---

## 4. Backend Setup & Configuration

### A. Python Virtual Environment

```bash
cd /var/www/linkedpulse/linkedin-optimizer

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install required dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### B. Configure Backend Environment (`.env`)

```bash
# Copy example configuration
cp .env.example .env

# Generate a strong 64-character secret key
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Edit `/var/www/linkedpulse/linkedin-optimizer/.env`:

```env
ENV=production
HOST=127.0.0.1
PORT=8000
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
SECRET_KEY=<OUTPUT_FROM_SECRETS_COMMAND_ABOVE>
DATABASE_PATH=/var/www/linkedpulse/data/linkedpulse.db
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
OPENROUTER_MODEL=openrouter/free
LINKEDIN_CLIENT_ID=your_actual_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_actual_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/linkedin/callback
LINKEDIN_API_VERSION=202610
```

### C. Persistent Storage Directory

```bash
# Ensure persistent database directory exists
mkdir -p /var/www/linkedpulse/data
chmod 700 /var/www/linkedpulse/data
```

---

## 5. Frontend Build

```bash
cd /var/www/linkedpulse/frontend/linkedin-post-studio

# Copy frontend env
cp .env.example .env

# Install dependencies and build static assets
npm install
npm run build

# Verify build output
ls -la dist/
```

---

## 6. Configure Systemd Service (Auto-Restart Backend)

Create `/etc/systemd/system/linkedpulse.service`:

```ini
[Unit]
Description=LinkedPulse Python Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/linkedpulse/linkedin-optimizer
EnvironmentFile=/var/www/linkedpulse/linkedin-optimizer/.env
ExecStart=/var/www/linkedpulse/linkedin-optimizer/venv/bin/python server.py
Restart=always
RestartSec=5
StandardOutput=append:/var/log/linkedpulse.log
StandardError=append:/var/log/linkedpulse.err

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Set ownership for www-data user
sudo chown -R www-data:www-data /var/www/linkedpulse

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable linkedpulse
sudo systemctl start linkedpulse

# Check service status
sudo systemctl status linkedpulse
```

---

## 7. Configure Nginx Reverse Proxy with SSL

Create `/etc/nginx/sites-available/linkedpulse.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Maximum payload size (allows 10MB image uploads)
    client_max_body_size 12M;

    # Frontend Static Files
    root /var/www/linkedpulse/frontend/linkedin-post-studio/dist;
    index index.html;

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API & Health Check Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket & connection headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and obtain free SSL/TLS certificate via Let's Encrypt:

```bash
# Enable Nginx configuration
sudo ln -s /etc/nginx/sites-available/linkedpulse.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 8. Verifying the Deployment

1. **Check Backend Health**:
   ```bash
   curl -i https://yourdomain.com/health
   # Expected: HTTP 200 OK, {"status":"healthy","database":"connected",...}
   ```
2. **Check Frontend**:
   Open `https://yourdomain.com` in your browser. Verify navigation, login, and registration.
3. **Verify Protected Pages**:
   Attempt to access `/dashboard` without an account; you should be redirected to `/login`.

---

## 9. Safe Zero-Downtime Update Procedure

When pushing updates to your server:

```bash
cd /var/www/linkedpulse

# 1. Backup database first
sqlite3 /var/www/linkedpulse/data/linkedpulse.db ".backup '/var/www/linkedpulse/data/backup_$(date +%F).db'"

# 2. Pull latest code
git pull origin main

# 3. Rebuild frontend
cd frontend/linkedin-post-studio
corepack enable && pnpm install --frozen-lockfile
pnpm run build

# 4. Restart backend service
sudo systemctl restart linkedpulse
```

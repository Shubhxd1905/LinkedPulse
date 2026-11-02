# LinkedPulse — Database Persistence, Backup & Restore Guide

LinkedPulse uses **SQLite with Write-Ahead Logging (`WAL` mode)** and strict foreign key enforcement (`PRAGMA foreign_keys = ON;`). This architecture delivers fast, transactional performance without needing a separate database service process.

---

## 1. Production Storage Compatibility

### A. Persistent Volume Rule (Containers & VMs)
- **Do not** store the SQLite database inside an ephemeral container layer (e.g. standard Docker image layer). When a container restarts, unmounted database files are lost.
- **Do** configure `DATABASE_PATH` to point to a mounted host directory or persistent cloud volume (e.g., `/data/linkedpulse.db`).

### B. Docker Compose Example
```yaml
version: '3.8'
services:
  backend:
    build: ./linkedin-optimizer
    environment:
      - DATABASE_PATH=/data/linkedpulse.db
      - ENV=production
    volumes:
      - linkedpulse_data:/data
volumes:
  linkedpulse_data:
```

---

## 2. Live Hot Backups (`.backup` Command)

Because LinkedPulse runs SQLite in WAL mode (`journal_mode = WAL`), standard file copying (`cp`) while the server is active can result in an inconsistent snapshot.

Always use SQLite's official **online backup API**:

```bash
# Set variables
DB_SOURCE="/var/www/linkedpulse/data/linkedpulse.db"
BACKUP_DIR="/var/backups/linkedpulse"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/linkedpulse_backup_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

# Perform safe live atomic snapshot
sqlite3 "$DB_SOURCE" ".backup '$BACKUP_FILE'"

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup created at: ${BACKUP_FILE}.gz"
```

---

## 3. Automated Daily Backup Cron Job

Create a backup script at `/usr/local/bin/linkedpulse_backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/linkedpulse"
DB_PATH="/var/www/linkedpulse/data/linkedpulse.db"
DATE=$(date +%Y-%m-%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/backup_${DATE}.db'"
gzip -f "${BACKUP_DIR}/backup_${DATE}.db"

# Retain backups for 14 days, delete older ones
find "$BACKUP_DIR" -type f -name "backup_*.db.gz" -mtime +14 -delete
```

Make executable and register in crontab:

```bash
sudo chmod +x /usr/local/bin/linkedpulse_backup.sh

# Run every night at 2:00 AM
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/linkedpulse_backup.sh > /dev/null 2>&1
```

---

## 4. Restore Procedure

To restore from a backup snapshot:

```bash
# 1. Stop the backend server
sudo systemctl stop linkedpulse

# 2. Archive the current corrupt/old state
mv /var/www/linkedpulse/data/linkedpulse.db /var/www/linkedpulse/data/linkedpulse_corrupt_$(date +%s).db
rm -f /var/www/linkedpulse/data/linkedpulse.db-wal /var/www/linkedpulse/data/linkedpulse.db-shm

# 3. Extract and restore backup file
gunzip -c /var/backups/linkedpulse/backup_YYYY-MM-DD_HHMMSS.db.gz > /var/www/linkedpulse/data/linkedpulse.db

# 4. Verify database integrity
sqlite3 /var/www/linkedpulse/data/linkedpulse.db "PRAGMA integrity_check;"
# Expected output: ok

# 5. Fix file permissions
sudo chown www-data:www-data /var/www/linkedpulse/data/linkedpulse.db
sudo chmod 600 /var/www/linkedpulse/data/linkedpulse.db

# 6. Restart backend server
sudo systemctl start linkedpulse
```

---

## 5. Future PostgreSQL Migration Strategy

The database access layer in [`database.py`](file:///c:/Users/Shubh/OneDrive/Documents/Study/Krutrim%20Insights/Intership%20Project/linkedin-optimizer/database.py) uses standard parameterized SQL and a clean query interface.

If your application scales to multiple web server nodes requiring a centralized database:
1. Export existing data to CSV or JSON using `sqlite3`:
   ```bash
   sqlite3 -header -csv linkedpulse.db "SELECT * FROM users;" > users.csv
   sqlite3 -header -csv linkedpulse.db "SELECT * FROM user_profiles;" > user_profiles.csv
   sqlite3 -header -csv linkedpulse.db "SELECT * FROM post_drafts;" > post_drafts.csv
   ```
2. Replace SQLite queries in `database.py` with `psycopg2` or `asyncpg` connection pools. The table schemas match standard PostgreSQL types (`TEXT`, `INTEGER`, `REAL`, `TIMESTAMPTZ`).

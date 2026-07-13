# Backup Central

Web-based backup dashboard for Docker containers, remote servers, and databases.

## Features

### Docker Container Backups (Portainer)
- Sync containers from any Portainer instance
- Full backup (configs, volumes, compose files, env vars, filesystem info)
- Partial backup (select what to include)
- Volume backup via Docker Archive API (no host filesystem access needed)
- Restore to same or different Portainer server (migration)
- Cron-based scheduling with retention policies

### SSH Remote Server Backups
- Connect to any Linux server via SSH (password or key auth)
- Backup remote directories via tar-over-SSH
- Test connection before backing up
- Store credentials encrypted (AES-256-GCM)

### MySQL/MariaDB Database Backups
- Connect to external MySQL or MariaDB servers
- List available databases from the server
- Select specific databases or backup all
- SQL dump with gzip compression
- Store credentials encrypted (AES-256-GCM)

### Dashboard
- Unified dashboard showing all backup sources
- Storage breakdown (Docker vs SSH vs DB)
- Recent activity from all sources
- Failed backup alerts across all sources
- Container, SSH server, and database server counts

## Quick Start (Standalone)

### 1. Setup MySQL

Connect to your MySQL server and run both SQL files:

```bash
mysql -u root -p < init.sql
mysql -u root -p < migrate_external_sources.sql
```

### 2. Install & Build

```bash
# Install backend dependencies
cd backend
cp .env.example .env   # Edit with your settings
npm install

# Install frontend dependencies and build
cd ../frontend
npm install
npm run build
```

Or double-click **setup.bat** on Windows.

### 3. Run

```bash
cd backend
npm start
```

Or double-click **start.bat** on Windows.

Access at **http://localhost:3080**

Login: `admin` / `BackupCentral2026!`

## Deploy on Synology NAS (Laragon Apache)

### Prerequisites
- Laragon with Apache running on port 9080
- MySQL server (existing)
- Portainer instance
- Node.js installed on NAS

### Steps

1. **Copy files** to your web root:
   ```
   www/backupcentral/
     .htaccess          <- deploy/.htaccess
     proxy.php          <- deploy/proxy.php
     frontend/dist/     <- built frontend
     backend/           <- entire backend/ folder
     migrate_external_sources.sql
   ```

2. **Install backend dependencies** on the NAS:
   ```bash
   cd www/backupcentral/backend
   npm install
   ```

3. **Configure** — copy `backend/.env.example` to `backend/.env` and edit:
   ```env
   DB_HOST=your-mysql-host
   DB_PORT=3306
   DB_USER=backup_central
   DB_PASSWORD=your_password
   DB_NAME=backup_central
   PORTAINER_URL=http://your-portainer:9000
   PORTAINER_USER=admin
   PORTAINER_PASSWORD=your_password
   BACKUP_ROOT=/app/backups
   JWT_SECRET=generate_random_string
   ENCRYPTION_KEY=generate_random_string
   PORT=3080
   ```

4. **Run SQL migrations** on your MySQL server:
   ```bash
   mysql -u root -p backup_central < init.sql
   mysql -u root -p backup_central < migrate_external_sources.sql
   ```

5. **Access** at `http://your-nas:9080/backupcentral/`

### Notes
- `proxy.php` auto-starts the Node.js backend on first API request
- `.htaccess` includes `SetEnvIf Authorization` fix for Synology Apache header stripping
- The backend listens on port 3080 internally; Apache proxies via `proxy.php`
- `proxy.php` serves static files from `frontend/dist/`
- Backup root `/app/backups` maps to the web directory (writable by application user inside the Docker container)

## Project Structure

```
BackupCentral/
├── setup.bat                    # One-time setup (npm install + build)
├── start.bat                    # Launch the app
├── init.sql                     # MySQL schema (core tables)
├── migrate_external_sources.sql # Migration (SSH + DB tables)
├── deploy/                      # Apache deployment files
│   ├── .htaccess                # Apache rewrite rules
│   ├── proxy.php                # PHP reverse proxy to Node.js
│   └── README.md
├── backend/
│   ├── .env.example             # Config template
│   ├── package.json
│   └── src/
│       ├── index.js             # Express server
│       ├── config.js            # Config loader
│       ├── db.js                # MySQL connection
│       ├── middleware/
│       │   └── auth.js          # JWT authentication
│       ├── routes/
│       │   ├── auth.js          # Login, token verify
│       │   ├── dashboard.js     # Aggregated stats
│       │   ├── containers.js    # Container list, sync
│       │   ├── backups.js       # Container backup CRUD
│       │   ├── restore.js       # Restore + migration
│       │   ├── schedules.js     # Cron schedule CRUD
│       │   ├── settings.js      # App settings
│       │   ├── remoteConnections.js  # SSH connection CRUD
│       │   ├── remoteBackups.js      # SSH backup operations
│       │   ├── dbConnections.js      # DB connection CRUD
│       │   └── dbBackups.js          # DB backup operations
│       └── services/
│           ├── portainer.js     # Portainer API client
│           ├── backup.js        # Container backup engine
│           ├── restore.js       # Container restore engine
│           ├── scheduler.js     # Cron scheduler
│           ├── encryption.js    # AES-256-GCM encrypt/decrypt
│           ├── remoteBackup.js  # SSH backup engine
│           └── dbBackup.js      # MySQL dump engine
└── frontend/
    ├── package.json
    └── src/                     # React + Vite + Tailwind
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── ContainersPage.jsx
        │   ├── BackupsPage.jsx
        │   ├── RestorePage.jsx
        │   ├── RemoteServersPage.jsx
        │   ├── DatabaseServersPage.jsx
        │   ├── SchedulesPage.jsx
        │   └── SettingsPage.jsx
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── BackupModal.jsx
        │   └── ScheduleModal.jsx
        └── services/
            └── api.js           # API client
```

## Database Schema

| Table | Description |
|---|---|
| `containers` | Docker containers synced from Portainer |
| `backups` | Container backup records |
| `schedules` | Cron-based backup schedules |
| `restore_logs` | Restore/migration operation history |
| `settings` | Application settings |
| `remote_connections` | SSH server connections (credentials encrypted) |
| `remote_backups` | Remote file backup records |
| `database_connections` | MySQL/MariaDB connections (credentials encrypted) |
| `database_backups` | Database dump records |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/login | Authenticate |
| GET | /api/dashboard | Aggregated stats |
| GET | /api/containers | List containers |
| POST | /api/containers/sync | Sync from Portainer |
| GET/POST | /api/backups | List/create container backups |
| DELETE | /api/backups/:id | Delete backup |
| POST | /api/restore | Start restore |
| GET | /api/restore/logs | Restore history |
| GET/POST | /api/schedules | List/create schedules |
| PUT/DELETE | /api/schedules/:id | Update/delete schedule |
| GET | /api/settings | List settings |
| PUT | /api/settings | Update settings |
| GET/POST | /api/remote-connections | List/create SSH connections |
| POST | /api/remote-connections/:id/test | Test SSH connection |
| GET/POST | /api/remote-backups | List/create remote backups |
| GET/POST | /api/db-connections | List/create DB connections |
| POST | /api/db-connections/:id/test | Test DB connection |
| GET | /api/db-connections/:id/databases | List databases |
| GET/POST | /api/db-backups | List/create DB backups |

## Config

Edit `backend/.env` to change settings. See `backend/.env.example` for all options.

## Recovery Tags

| Tag | Description |
|---|---|
| `v1.0.0-stable` | Pre-external-sources: Docker container backup/restore/migrate |
| `v1.1.0` | External sources: SSH + MySQL database backups |

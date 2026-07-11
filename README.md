# Backup Central

Web-based container backup dashboard for Portainer-managed Docker environments.

## Quick Start (Standalone)

### 1. Setup MySQL

Connect to your MySQL server and run `init.sql`:

```bash
mysql -u root -p < init.sql
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
     .htaccess       <- deploy/.htaccess
     proxy.php       <- deploy/proxy.php
     index.html      <- frontend/dist/
     assets/         <- frontend/dist/assets/
     backend/        <- entire backend/ folder
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
   BACKUP_ROOT=/volume1/DATA/BackupCentral
   JWT_SECRET=generate_random_string
   ENCRYPTION_KEY=generate_random_string
   PORT=3080
   ```

4. **Run init.sql** on your MySQL server

5. **Access** at `http://your-nas:9080/backupcentral/`

### Notes
- `proxy.php` auto-starts the Node.js backend on first API request
- `.htaccess` includes `SetEnvIf Authorization` fix for Synology Apache header stripping
- The backend listens on port 3080 internally; Apache proxies via `proxy.php`

## Config

Edit `backend/.env` to change settings.

## Project Structure

```
BackupCentral/
├── setup.bat                # One-time setup (npm install + build)
├── start.bat                # Launch the app
├── init.sql                 # MySQL schema
├── deploy/                  # Apache deployment files
│   ├── .htaccess            # Apache rewrite rules
│   ├── proxy.php            # PHP reverse proxy to Node.js
│   └── README.md            # Deploy instructions
├── backend/
│   ├── .env.example         # Config template
│   ├── package.json
│   └── src/
│       ├── index.js         # Express server
│       ├── config.js        # Config loader
│       ├── db.js            # MySQL connection
│       ├── middleware/auth.js
│       ├── routes/          # API routes (auth, dashboard, containers, backups, restore, schedules, settings)
│       └── services/        # Portainer API, backup engine, restore engine, scheduler
└── frontend/
    ├── package.json
    └── src/                 # React + Tailwind dashboard
```

## Features

- Sync containers from Portainer
- Full backup (configs, volumes, compose files, env vars)
- Partial backup (select what to include)
- Backup status, history, storage usage
- Cron-based scheduling with retention policies
- Restore from backup
- Migration to another Portainer server
- Dark mode dashboard

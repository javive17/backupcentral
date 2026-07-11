-- Backup Central - MySQL Init Script
-- Run this on your MySQL server (10.0.0.249:3306) as root

-- Create database
CREATE DATABASE IF NOT EXISTS backup_central CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (change password if needed)
CREATE USER IF NOT EXISTS 'backup_central'@'%' IDENTIFIED BY 'B@ckupC3ntr@l2026!';
GRANT ALL PRIVILEGES ON backup_central.* TO 'backup_central'@'%';
FLUSH PRIVILEGES;

USE backup_central;

-- Containers table
CREATE TABLE IF NOT EXISTS containers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    portainer_id VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(512),
    status VARCHAR(32) DEFAULT 'unknown',
    state VARCHAR(32) DEFAULT 'unknown',
    stack_id VARCHAR(64),
    stack_name VARCHAR(255),
    endpoint_id INT,
    created_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    sync_at DATETIME,
    INDEX idx_portainer_id (portainer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backups table
CREATE TABLE IF NOT EXISTS backups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    container_id INT NOT NULL,
    container_portainer_id VARCHAR(64) NOT NULL,
    type ENUM('full', 'partial') NOT NULL DEFAULT 'full',
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    backup_path VARCHAR(1024),
    backup_size BIGINT DEFAULT 0,
    include_image TINYINT(1) DEFAULT 1,
    include_volumes TINYINT(1) DEFAULT 1,
    include_configs TINYINT(1) DEFAULT 1,
    include_filesystem TINYINT(1) DEFAULT 1,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
    INDEX idx_container_id (container_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    container_id INT NOT NULL,
    container_portainer_id VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    cron_expression VARCHAR(128) NOT NULL,
    backup_type ENUM('full', 'partial') NOT NULL DEFAULT 'full',
    include_image TINYINT(1) DEFAULT 1,
    include_volumes TINYINT(1) DEFAULT 1,
    include_configs TINYINT(1) DEFAULT 1,
    include_filesystem TINYINT(1) DEFAULT 1,
    enabled TINYINT(1) DEFAULT 1,
    last_run DATETIME,
    next_run DATETIME,
    retention_count INT DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
    INDEX idx_enabled (enabled),
    INDEX idx_next_run (next_run)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restore logs table
CREATE TABLE IF NOT EXISTS restore_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_id INT NOT NULL,
    container_portainer_id VARCHAR(64) NOT NULL,
    target_portainer_url VARCHAR(512),
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE,
    INDEX idx_backup_id (backup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(128) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(512),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings
INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, description) VALUES
('portainer_url', 'http://10.0.0.249:9000', 'string', 'Portainer server URL'),
('backup_root', 'Z:\\BackupCentral', 'string', 'Root directory for backups'),
('auto_sync_containers', 'true', 'boolean', 'Auto-sync containers from Portainer'),
('sync_interval_minutes', '5', 'number', 'Container sync interval in minutes'),
('default_retention_count', '10', 'number', 'Default number of backups to retain'),
('notify_on_failure', 'true', 'boolean', 'Send notification on backup failure');

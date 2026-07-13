-- Backup Central - Migration: External Sources (SSH + Database)
-- Run this AFTER init.sql on your MySQL server

USE backup_central;

-- SSH/FTP remote server connections
CREATE TABLE IF NOT EXISTS remote_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(512) NOT NULL,
    port INT NOT NULL DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT,
    key_path VARCHAR(1024),
    description TEXT,
    enabled TINYINT(1) DEFAULT 1,
    last_backup_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Remote file backup records
CREATE TABLE IF NOT EXISTS remote_backups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    connection_id INT NOT NULL,
    remote_path VARCHAR(1024) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    backup_path VARCHAR(1024),
    backup_size BIGINT DEFAULT 0,
    file_count INT DEFAULT 0,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES remote_connections(id) ON DELETE CASCADE,
    INDEX idx_connection_id (connection_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- External database server connections
CREATE TABLE IF NOT EXISTS database_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(512) NOT NULL,
    port INT NOT NULL DEFAULT 3306,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT,
    databases_to_backup TEXT,
    description TEXT,
    enabled TINYINT(1) DEFAULT 1,
    last_backup_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Database dump records
CREATE TABLE IF NOT EXISTS database_backups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    connection_id INT NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    backup_path VARCHAR(1024),
    backup_size BIGINT DEFAULT 0,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES database_connections(id) ON DELETE CASCADE,
    INDEX idx_connection_id (connection_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

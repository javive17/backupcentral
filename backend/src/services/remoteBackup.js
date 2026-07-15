const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../db');
const { decrypt } = require('./encryption');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function dirSize(dirPath) {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) total += dirSize(fullPath);
    else total += fs.statSync(fullPath).size;
  }
  return total;
}

function countFiles(dirPath) {
  let count = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) count += countFiles(path.join(dirPath, entry.name));
    else count++;
  }
  return count;
}

function createSshConnection(connection) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const connectOpts = {
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      readyTimeout: 15000,
    };

    if (connection.key_path && fs.existsSync(connection.key_path)) {
      connectOpts.privateKey = fs.readFileSync(connection.key_path);
    } else if (connection.password_encrypted) {
      connectOpts.password = decrypt(connection.password_encrypted);
    }

    conn.on('ready', () => resolve(conn));
    conn.on('error', (err) => reject(new Error(`SSH connection failed: ${err.message}`)));
    conn.connect(connectOpts);
  });
}

function sftpDownloadDir(sftp, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (err, list) => {
      if (err) return reject(err);
      ensureDir(localPath);
      let pending = list.length;
      if (pending === 0) return resolve();

      for (const item of list) {
        const remoteItem = path.posix.join(remotePath, item.filename);
        const localItem = path.join(localPath, item.filename);

        if (item.attrs.isDirectory()) {
          sftpDownloadDir(sftp, remoteItem, localItem)
            .then(() => { if (--pending === 0) resolve(); })
            .catch(reject);
        } else {
          sftp.fastGet(remoteItem, localItem, (err) => {
            if (err) return reject(err);
            if (--pending === 0) resolve();
          });
        }
      }
    });
  });
}

async function testConnection(connection) {
  const conn = await createSshConnection(connection);
  return new Promise((resolve, reject) => {
    conn.exec('echo ok && uname -a && whoami', (err, stream) => {
      if (err) { conn.end(); return reject(err); }
      let output = '';
      stream.on('data', (data) => { output += data.toString(); });
      stream.stderr.on('data', (data) => { output += data.toString(); });
      stream.on('close', () => {
        conn.end();
        resolve({ success: true, output: output.trim() });
      });
    });
  });
}

async function listRemoteDirectory(connection, remotePath) {
  const conn = await createSshConnection(connection);
  return new Promise((resolve, reject) => {
    conn.exec(`ls -la ${remotePath} 2>&1`, (err, stream) => {
      if (err) { conn.end(); return reject(err); }
      let output = '';
      stream.on('data', (data) => { output += data.toString(); });
      stream.on('close', () => {
        conn.end();
        const lines = output.trim().split('\n').filter(l => l && !l.startsWith('total'));
        const items = lines.map(line => {
          const parts = line.split(/\s+/);
          const perms = parts[0] || '';
          const name = parts.slice(8).join(' ');
          return { permissions: perms, name, isDir: perms.startsWith('d') };
        }).filter(i => i.name && i.name !== '.' && i.name !== '..');
        resolve(items);
      });
    });
  });
}

async function createBackup(backupId, connectionId, remotePath) {
  try {
    await db.query(`UPDATE remote_backups SET status='running', started_at=NOW() WHERE id=?`, [backupId]);

    const connRow = await db.queryOne(`SELECT * FROM remote_connections WHERE id=?`, [connectionId]);
    if (!connRow) throw new Error('Connection not found');

    const backupDir = path.join(config.backup.root, 'remote', connRow.name);
    ensureDir(backupDir);
    const timestamp = getTimestamp();
    const backupPath = path.join(backupDir, `backup_${timestamp}`);
    ensureDir(backupPath);

    const conn = await createSshConnection(connRow);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { conn.end(); reject(new Error('Backup timed out after 30 minutes')); }, 30 * 60 * 1000);
      conn.exec(`tar cf /tmp/bc_backup_${timestamp}.tar -C "${remotePath}" . 2>&1`, (err, stream) => {
        if (err) { clearTimeout(timeout); conn.end(); return reject(err); }
        let stderr = '';
        stream.on('data', () => {});
        stream.stderr.on('data', (d) => { stderr += d.toString(); });
        stream.on('close', (code) => {
          clearTimeout(timeout);
          if (code !== 0) { conn.end(); return reject(new Error(`tar failed: ${stderr}`)); }
          resolve();
        });
      });
    });

    const tarPath = path.join(backupPath, 'data.tar');
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }
        sftp.fastGet(`/tmp/bc_backup_${timestamp}.tar`, tarPath, (err) => {
          if (err) { conn.end(); return reject(err); }
          sftp.unlink(`/tmp/bc_backup_${timestamp}.tar`, () => {});
          conn.end();
          resolve();
        });
      });
    });

    conn.end();

    const manifest = {
      backupId,
      connectionId,
      connectionName: connRow.name,
      remoteHost: connRow.host,
      remotePath,
      timestamp,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const totalSize = dirSize(backupPath);
    const fileCount = countFiles(backupPath);

    await db.query(
      `UPDATE remote_backups SET status='completed', backup_path=?, backup_size=?, file_count=?, completed_at=NOW() WHERE id=?`,
      [backupPath, totalSize, fileCount, backupId]
    );

    await db.query(`UPDATE remote_connections SET last_backup_at=NOW() WHERE id=?`, [connectionId]);

    return { success: true, backupPath, totalSize, fileCount };
  } catch (err) {
    await db.query(
      `UPDATE remote_backups SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`,
      [err.message, backupId]
    );
    throw err;
  }
}

module.exports = { testConnection, listRemoteDirectory, createBackup };

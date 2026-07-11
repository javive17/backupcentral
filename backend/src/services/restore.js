const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const portainer = require('./portainer');
const db = require('../db');

async function restoreBackup(restoreLogId, backupId, targetPortainerUrl) {
  try {
    await db.query(
      `UPDATE restore_logs SET status='running', started_at=NOW() WHERE id=?`,
      [restoreLogId]
    );

    const backup = await db.queryOne(`SELECT * FROM backups WHERE id=?`, [backupId]);
    if (!backup || !backup.backup_path) throw new Error('Backup not found');
    if (!fs.existsSync(backup.backup_path)) throw new Error('Backup directory not found');

    const manifestPath = path.join(backup.backup_path, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('Backup manifest not found');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const targetUrl = targetPortainerUrl || config.portainer.url;
    const token = await getTargetToken(targetUrl);

    let endpointId = null;
    const endpoints = await getTargetEndpoints(targetUrl, token);
    if (endpoints.length > 0) endpointId = endpoints[0].Id;

    if (manifest.includeImage) {
      const imageFiles = fs.readdirSync(backup.backup_path).filter(f => f.startsWith('image_') && f.endsWith('.tar'));
      for (const imgFile of imageFiles) {
        const imgPath = path.join(backup.backup_path, imgFile);
        try {
          execSync(`docker load -i "${imgPath}"`, { timeout: 600000 });
          console.log(`Image loaded from ${imgFile}`);
        } catch (e) {
          console.error(`Failed to load image ${imgFile}: ${e.message}`);
        }
      }
    }

    if (manifest.includeVolumes) {
      const volumesDir = path.join(backup.backup_path, 'volumes');
      if (fs.existsSync(volumesDir)) {
        const volFiles = fs.readdirSync(volumesDir).filter(f => f.endsWith('.tar.gz'));
        for (const volFile of volFiles) {
          const volPath = path.join(volumesDir, volFile);
          const volName = volFile.replace('.tar.gz', '');
          try {
            execSync(
              `tar -xzf "${volPath}" -C "${config.backup.dockerData}"`,
              { timeout: 600000 }
            );
            console.log(`Volume ${volName} restored`);
          } catch (e) {
            console.error(`Failed to restore volume ${volName}: ${e.message}`);
          }
        }
      }
    }

    if (manifest.includeConfigs) {
      const configPath = path.join(backup.backup_path, 'container_config.json');
      if (fs.existsSync(configPath)) {
        const containerConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        const composePath = path.join(backup.backup_path, 'docker-compose.yml');
        if (fs.existsSync(composePath) && containerConfig.Config?.Labels?.['com.docker.compose.project']) {
          const stackName = containerConfig.Config.Labels['com.docker.compose.project'];
          console.log(`Stack "${stackName}" compose file available for redeployment`);
        }
      }
    }

    await db.query(
      `UPDATE restore_logs SET status='completed', completed_at=NOW() WHERE id=?`,
      [restoreLogId]
    );

    return { success: true, manifest };
  } catch (err) {
    await db.query(
      `UPDATE restore_logs SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`,
      [err.message, restoreLogId]
    );
    throw err;
  }
}

async function getTargetToken(targetUrl) {
  const res = require('axios').post(`${targetUrl}/api/auth`, {
    Username: config.portainer.user,
    Password: config.portainer.password,
  });
  return (await res).data.jwt;
}

async function getTargetEndpoints(targetUrl, token) {
  const res = require('axios').get(`${targetUrl}/api/endpoints`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

module.exports = { restoreBackup };

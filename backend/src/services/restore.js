const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
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

    const endpoints = await getTargetEndpoints(targetUrl, token);
    let endpointId = null;
    if (Array.isArray(endpoints)) {
      endpointId = endpoints[0]?.Id;
    } else if (endpoints?.value?.length) {
      endpointId = endpoints.value[0].Id;
    }
    if (!endpointId) throw new Error('No endpoint found on target');

    const containerPortainerId = manifest.containerPortainerId;
    const containerConfigPath = path.join(backup.backup_path, 'container_config.json');
    let containerConfig = null;
    if (fs.existsSync(containerConfigPath)) {
      containerConfig = JSON.parse(fs.readFileSync(containerConfigPath, 'utf-8'));
    }

    if (manifest.includeImage && containerConfig) {
      try {
        const inspect = await portainer.getContainerInspect(endpointId, containerPortainerId);
        console.log(`Container ${containerConfig.Name} already exists, will recreate from backup`);
      } catch (e) {
        console.log(`Container not found on target, will create from config`);
      }
    }

    if (manifest.includeVolumes) {
      const volumesDir = path.join(backup.backup_path, 'volumes');
      if (fs.existsSync(volumesDir)) {
        const volumeMapPath = path.join(backup.backup_path, 'volume_map.json');
        let volumeMap = {};
        if (fs.existsSync(volumeMapPath)) {
          volumeMap = JSON.parse(fs.readFileSync(volumeMapPath, 'utf-8'));
        }
        const volDirs = fs.readdirSync(volumesDir, { withFileTypes: true }).filter(d => d.isDirectory());
        for (const volDir of volDirs) {
          const volPath = path.join(volumesDir, volDir.name);
          const containerMountPath = volumeMap[volDir.name] || volDir.name.replace(/^_/, '/');
          try {
            console.log(`Restoring volume ${volDir.name} -> ${containerMountPath}`);
            const tarData = await createTarFromDir(volPath);
            await uploadArchiveToContainer(targetUrl, token, endpointId, containerPortainerId, containerMountPath, tarData);
            console.log(`Volume ${volDir.name} restored`);
          } catch (e) {
            console.error(`Failed to restore volume ${volDir.name}: ${e.message}`);
          }
        }
      }
    }

    if (manifest.includeConfigs && containerConfig) {
      const labels = containerConfig.Config?.Labels || {};
      const stackName = labels['com.docker.compose.project'];
      if (stackName) {
        const composePath = path.join(backup.backup_path, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
          console.log(`Compose file available for stack "${stackName}" redeployment`);
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

function createTarFromDir(dirPath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('tar', { gzip: false });
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.glob('**/*', { cwd: dirPath, dot: true });
    archive.finalize();
  });
}

async function uploadArchiveToContainer(targetUrl, token, endpointId, containerId, containerPath, tarBuffer) {
  const axios = require('axios');
  await axios.put(
    `${targetUrl}/api/endpoints/${endpointId}/docker/containers/${containerId}/archive?path=${encodeURIComponent(containerPath)}`,
    tarBuffer,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-tar',
      },
      timeout: 300000,
    }
  );
}

async function getTargetToken(targetUrl) {
  const axios = require('axios');
  const res = await axios.post(`${targetUrl}/api/auth`, {
    Username: config.portainer.user,
    Password: config.portainer.password,
  });
  return res.data.jwt;
}

async function getTargetEndpoints(targetUrl, token) {
  const axios = require('axios');
  const res = await axios.get(`${targetUrl}/api/endpoints`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

module.exports = { restoreBackup };

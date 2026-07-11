const fs = require('fs');
const path = require('path');
const config = require('../config');
const portainer = require('./portainer');
const db = require('../db');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getBackupDir(containerName) {
  const dir = path.join(config.backup.root, containerName);
  ensureDir(dir);
  return dir;
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
    if (entry.isDirectory()) {
      total += dirSize(fullPath);
    } else {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function copyDirSync(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function createBackup(backupId, containerPortainerId, options = {}) {
  const {
    type = 'full',
    includeImage = true,
    includeVolumes = true,
    includeConfigs = true,
    includeFilesystem = true,
  } = options;

  try {
    await db.query(
      `UPDATE backups SET status='running', started_at=NOW() WHERE id=?`,
      [backupId]
    );

    const endpoints = await portainer.getEndpoints();
    let endpointId = null;
    let containerInfo = null;

    for (const ep of endpoints) {
      try {
        const containers = await portainer.getContainers(ep.Id);
        const found = containers.find(c => c.Id === containerPortainerId || c.Id.startsWith(containerPortainerId));
        if (found) {
          endpointId = ep.Id;
          containerInfo = found;
          break;
        }
      } catch (e) { continue; }
    }

    if (!endpointId || !containerInfo) {
      throw new Error(`Container ${containerPortainerId} not found on any endpoint`);
    }

    const containerName = (containerInfo.Names?.[0] || containerPortainerId.slice(0, 12)).replace(/^\//, '');
    const backupDir = getBackupDir(containerName);
    const timestamp = getTimestamp();
    const backupPath = path.join(backupDir, `backup_${timestamp}`);
    ensureDir(backupPath);

    let totalSize = 0;

    if (includeConfigs) {
      const inspect = await portainer.getContainerInspect(endpointId, containerPortainerId);
      fs.writeFileSync(
        path.join(backupPath, 'container_config.json'),
        JSON.stringify(inspect, null, 2)
      );
      totalSize += fs.statSync(path.join(backupPath, 'container_config.json')).size;

      if (inspect.Config?.Labels) {
        const stackName = inspect.Config.Labels['com.docker.compose.project'];
        if (stackName) {
          try {
            const stacks = await portainer.getStacks();
            const stack = stacks.find(s => s.Name === stackName);
            if (stack) {
              const stackDetail = await portainer.apiGet(`/api/stacks/${stack.Id}/file`);
              const composeContent = stackDetail.StackFileContent || '';
              if (composeContent) {
                fs.writeFileSync(path.join(backupPath, 'docker-compose.yml'), composeContent);
                totalSize += Buffer.byteLength(composeContent);
              }
            }
          } catch (e) { /* stack file not available */ }
        }
      }

      const envVars = inspect.Config?.Env || [];
      if (envVars.length) {
        fs.writeFileSync(path.join(backupPath, 'env.txt'), envVars.join('\n'));
        totalSize += fs.statSync(path.join(backupPath, 'env.txt')).size;
      }

      const portBindings = inspect.NetworkSettings?.Ports || {};
      fs.writeFileSync(
        path.join(backupPath, 'ports.json'),
        JSON.stringify(portBindings, null, 2)
      );
      totalSize += fs.statSync(path.join(backupPath, 'ports.json')).size;

      const labels = inspect.Config?.Labels || {};
      fs.writeFileSync(
        path.join(backupPath, 'labels.json'),
        JSON.stringify(labels, null, 2)
      );
      totalSize += fs.statSync(path.join(backupPath, 'labels.json')).size;
    }

    if (includeVolumes && containerInfo.Mounts?.length) {
      const volumesDir = path.join(backupPath, 'volumes');
      ensureDir(volumesDir);

      for (const mount of containerInfo.Mounts) {
        if (mount.Type === 'volume' || mount.Type === 'bind') {
          const sourcePath = mount.Source;
          const volName = mount.Name || sourcePath.replace(/[^a-zA-Z0-9._-]/g, '_');
          const volBackup = path.join(volumesDir, volName);

          if (fs.existsSync(sourcePath)) {
            try {
              copyDirSync(sourcePath, volBackup);
              totalSize += dirSize(volBackup);
            } catch (e) {
              console.error(`Volume backup failed for ${volName}: ${e.message}`);
            }
          }
        }
      }
    }

    if (includeFilesystem) {
      const fsInfo = {
        hostname: require('os').hostname(),
        platform: require('os').platform(),
        mounts: (containerInfo.Mounts || []).map(m => ({
          type: m.Type,
          source: m.Source,
          destination: m.Destination,
          mode: m.Mode,
          rw: m.RW,
          name: m.Name,
        })),
      };
      fs.writeFileSync(
        path.join(backupPath, 'filesystem_info.json'),
        JSON.stringify(fsInfo, null, 2)
      );
      totalSize += fs.statSync(path.join(backupPath, 'filesystem_info.json')).size;
    }

    if (includeImage) {
      const imageInfo = {
        image: containerInfo.Image,
        id: containerInfo.ImageID,
      };
      fs.writeFileSync(
        path.join(backupPath, 'image_info.json'),
        JSON.stringify(imageInfo, null, 2)
      );
      totalSize += fs.statSync(path.join(backupPath, 'image_info.json')).size;
    }

    const manifest = {
      backupId,
      containerPortainerId,
      containerName,
      containerImage: containerInfo.Image,
      type,
      timestamp,
      includeImage,
      includeVolumes,
      includeConfigs,
      includeFilesystem,
      totalSize,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
    totalSize += fs.statSync(path.join(backupPath, 'manifest.json')).size;

    await db.query(
      `UPDATE backups SET status='completed', backup_path=?, backup_size=?, completed_at=NOW() WHERE id=?`,
      [backupPath, totalSize, backupId]
    );

    await cleanupOldBackups(containerPortainerId);

    return { success: true, backupPath, totalSize };
  } catch (err) {
    await db.query(
      `UPDATE backups SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`,
      [err.message, backupId]
    );
    throw err;
  }
}

async function cleanupOldBackups(containerPortainerId) {
  const row = await db.queryOne(
    `SELECT s.retention_count FROM schedules s WHERE s.container_portainer_id=? AND s.enabled=1 LIMIT 1`,
    [containerPortainerId]
  );
  const retention = row?.retention_count || 10;

  const backups = await db.query(
    `SELECT id, backup_path FROM backups
     WHERE container_portainer_id=? AND status='completed'
     ORDER BY created_at DESC`,
    [containerPortainerId]
  );

  if (backups.length > retention) {
    const toDelete = backups.slice(retention);
    for (const b of toDelete) {
      if (b.backup_path && fs.existsSync(b.backup_path)) {
        try { fs.rmSync(b.backup_path, { recursive: true, force: true }); } catch (e) {}
      }
      await db.query(`DELETE FROM backups WHERE id=?`, [b.id]);
    }
  }
}

module.exports = { createBackup, getBackupDir, cleanupOldBackups };

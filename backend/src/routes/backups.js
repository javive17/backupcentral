const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const backupService = require('../services/backup');
const fs = require('fs');
const path = require('path');

router.get('/', auth, async (req, res) => {
  try {
    const { container_id, status } = req.query;
    let sql = `SELECT b.*, c.name as container_name FROM backups b
               JOIN containers c ON b.container_id = c.id WHERE 1=1`;
    const params = [];

    if (container_id) { sql += ' AND b.container_id=?'; params.push(container_id); }
    if (status) { sql += ' AND b.status=?'; params.push(status); }

    sql += ' ORDER BY b.created_at DESC LIMIT 100';
    const backups = await db.query(sql, params);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { container_id, type = 'full', include_image = true, include_volumes = true, include_configs = true, include_filesystem = true } = req.body;

    const container = await db.queryOne('SELECT * FROM containers WHERE id=?', [container_id]);
    if (!container) return res.status(404).json({ error: 'Container not found' });

    const result = await db.insert(
      `INSERT INTO backups (container_id, container_portainer_id, type, include_image, include_volumes, include_configs, include_filesystem, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [container_id, container.portainer_id, type, include_image, include_volumes, include_configs, include_filesystem]
    );

    res.json({ id: result.insertId, message: 'Backup started' });

    backupService.createBackup(result.insertId, container.portainer_id, {
      type, includeImage: !!include_image, includeVolumes: !!include_volumes,
      includeConfigs: !!include_configs, includeFilesystem: !!include_filesystem,
    }).catch(err => console.error('Backup failed:', err.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const backup = await db.queryOne(
      `SELECT b.*, c.name as container_name FROM backups b
       JOIN containers c ON b.container_id = c.id WHERE b.id=?`,
      [req.params.id]
    );
    if (!backup) return res.status(404).json({ error: 'Backup not found' });
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const backup = await db.queryOne('SELECT * FROM backups WHERE id=?', [req.params.id]);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    if (backup.backup_path && fs.existsSync(backup.backup_path)) {
      fs.rmSync(backup.backup_path, { recursive: true, force: true });
    }
    await db.query('DELETE FROM backups WHERE id=?', [req.params.id]);
    res.json({ message: 'Backup deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/download', auth, async (req, res) => {
  try {
    const backup = await db.queryOne('SELECT * FROM backups WHERE id=?', [req.params.id]);
    if (!backup || !backup.backup_path) return res.status(404).json({ error: 'Backup not found' });

    const manifestPath = path.join(backup.backup_path, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return res.status(404).json({ error: 'Backup files not found' });

    res.json({
      backup_path: backup.backup_path,
      files: fs.readdirSync(backup.backup_path),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

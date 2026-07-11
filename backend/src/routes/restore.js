const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const restoreService = require('../services/restore');

router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await db.query(
      `SELECT rl.*, b.type as backup_type, b.backup_path, c.name as container_name
       FROM restore_logs rl
       JOIN backups b ON rl.backup_id = b.id
       JOIN containers c ON rl.container_portainer_id = c.portainer_id
       ORDER BY rl.created_at DESC LIMIT 50`
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { backup_id, target_portainer_url } = req.body;

    const backup = await db.queryOne('SELECT * FROM backups WHERE id=? AND status="completed"', [backup_id]);
    if (!backup) return res.status(404).json({ error: 'Completed backup not found' });

    const result = await db.insert(
      `INSERT INTO restore_logs (backup_id, container_portainer_id, target_portainer_url, status)
       VALUES (?, ?, ?, 'pending')`,
      [backup_id, backup.container_portainer_id, target_portainer_url || null]
    );

    res.json({ id: result.insertId, message: 'Restore started' });

    restoreService.restoreBackup(result.insertId, backup_id, target_portainer_url)
      .catch(err => console.error('Restore failed:', err.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/migration/:container_portainer_id', auth, async (req, res) => {
  try {
    const backups = await db.query(
      `SELECT b.*, c.name as container_name FROM backups b
       JOIN containers c ON b.container_id = c.id
       WHERE b.container_portainer_id=? AND b.status='completed'
       ORDER BY b.created_at DESC`,
      [req.params.container_portainer_id]
    );
    res.json({
      container_portainer_id: req.params.container_portainer_id,
      available_backups: backups,
      migration_ready: backups.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

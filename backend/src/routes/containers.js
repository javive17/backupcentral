const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const portainer = require('../services/portainer');

router.get('/', auth, async (req, res) => {
  try {
    const containers = await db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM backups b WHERE b.container_id=c.id AND b.status='completed') as backup_count,
        (SELECT b.completed_at FROM backups b WHERE b.container_id=c.id AND b.status='completed' ORDER BY b.completed_at DESC LIMIT 1) as last_backup_at
       FROM containers c ORDER BY c.name`
    );
    res.json(containers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', auth, async (req, res) => {
  try {
    const endpoints = await portainer.getEndpoints();
    let synced = 0;

    for (const endpoint of endpoints) {
      try {
        const containers = await portainer.getContainers(endpoint.Id);
        for (const c of containers) {
          const name = (c.Names?.[0] || c.Id.slice(0, 12)).replace(/^\//, '');
          const state = c.State || 'unknown';
          const status = c.Status || '';
          const image = c.Image || '';

          let stackId = null;
          let stackName = null;
          if (c.Labels) {
            stackName = c.Labels['com.docker.compose.project'] || null;
            stackId = c.Labels['com.docker.compose.project.config_files'] || null;
          }

          await db.query(
            `INSERT INTO containers (portainer_id, name, image, status, state, stack_id, stack_name, endpoint_id, sync_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               name=VALUES(name), image=VALUES(image), status=VALUES(status),
               state=VALUES(state), stack_id=VALUES(stack_id), stack_name=VALUES(stack_name),
               endpoint_id=VALUES(endpoint_id), sync_at=NOW()`,
            [c.Id, name, image, status, state, stackId, stackName, endpoint.Id]
          );
          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync endpoint ${endpoint.Id}: ${e.message}`);
      }
    }

    res.json({ synced, message: `Synced ${synced} containers` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const container = await db.queryOne('SELECT * FROM containers WHERE id=?', [req.params.id]);
    if (!container) return res.status(404).json({ error: 'Container not found' });

    const backups = await db.query(
      `SELECT * FROM backups WHERE container_id=? ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );

    const schedules = await db.query(
      `SELECT * FROM schedules WHERE container_id=? ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ ...container, backups, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

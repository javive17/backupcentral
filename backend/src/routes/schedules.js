const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const scheduler = require('../services/scheduler');

router.get('/', auth, async (req, res) => {
  try {
    const schedules = await db.query(
      `SELECT s.*, c.name as container_name
       FROM schedules s
       JOIN containers c ON s.container_id = c.id
       ORDER BY s.created_at DESC`
    );
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      container_id, name, cron_expression, backup_type = 'full',
      include_image = true, include_volumes = true, include_configs = true,
      include_filesystem = true, retention_count = 10,
    } = req.body;

    const container = await db.queryOne('SELECT * FROM containers WHERE id=?', [container_id]);
    if (!container) return res.status(404).json({ error: 'Container not found' });

    const cron = require('node-cron');
    if (!cron.validate(cron_expression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const [result] = await db.insert(
      `INSERT INTO schedules (container_id, container_portainer_id, name, cron_expression, backup_type,
        include_image, include_volumes, include_configs, include_filesystem, retention_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [container_id, container.portainer_id, name, cron_expression, backup_type,
        include_image, include_volumes, include_configs, include_filesystem, retention_count]
    );

    const newSchedule = await db.queryOne('SELECT * FROM schedules WHERE id=?', [result.insertId]);
    scheduler.scheduleContainer(newSchedule);

    res.json({ id: result.insertId, message: 'Schedule created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, cron_expression, backup_type, include_image, include_volumes,
      include_configs, include_filesystem, enabled, retention_count } = req.body;

    const existing = await db.queryOne('SELECT * FROM schedules WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Schedule not found' });

    await db.query(
      `UPDATE schedules SET
        name=COALESCE(?,name), cron_expression=COALESCE(?,cron_expression),
        backup_type=COALESCE(?,backup_type), include_image=COALESCE(?,include_image),
        include_volumes=COALESCE(?,include_volumes), include_configs=COALESCE(?,include_configs),
        include_filesystem=COALESCE(?,include_filesystem), enabled=COALESCE(?,enabled),
        retention_count=COALESCE(?,retention_count)
       WHERE id=?`,
      [name, cron_expression, backup_type, include_image, include_volumes,
        include_configs, include_filesystem, enabled, retention_count, req.params.id]
    );

    const updated = await db.queryOne('SELECT * FROM schedules WHERE id=?', [req.params.id]);
    if (updated.enabled) {
      scheduler.scheduleContainer(updated);
    } else {
      scheduler.stopSchedule(updated.id);
    }

    res.json({ message: 'Schedule updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    scheduler.stopSchedule(parseInt(req.params.id));
    await db.query('DELETE FROM schedules WHERE id=?', [req.params.id]);
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

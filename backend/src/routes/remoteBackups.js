const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const remoteBackup = require('../services/remoteBackup');

router.get('/', auth, async (req, res) => {
  try {
    let query = `SELECT rb.*, rc.name as connection_name, rc.host
                 FROM remote_backups rb
                 JOIN remote_connections rc ON rb.connection_id = rc.id`;
    const params = [];
    if (req.query.connection_id) {
      query += ' WHERE rb.connection_id=?';
      params.push(req.query.connection_id);
    }
    if (req.query.status) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' rb.status=?';
      params.push(req.query.status);
    }
    query += ' ORDER BY rb.created_at DESC LIMIT 100';
    const backups = await db.query(query, params);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { connection_id, remote_path } = req.body;
    if (!connection_id || !remote_path) return res.status(400).json({ error: 'connection_id and remote_path are required' });

    const conn = await db.queryOne('SELECT * FROM remote_connections WHERE id=?', [connection_id]);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const result = await db.insert(
      `INSERT INTO remote_backups (connection_id, remote_path, status) VALUES (?, ?, 'pending')`,
      [connection_id, remote_path]
    );

    res.json({ id: result.insertId, message: 'Backup started' });

    remoteBackup.createBackup(result.insertId, connection_id, remote_path)
      .catch(err => console.error('Remote backup failed:', err.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const backup = await db.queryOne('SELECT * FROM remote_backups WHERE id=?', [req.params.id]);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    if (backup.backup_path) {
      const fs = require('fs');
      if (fs.existsSync(backup.backup_path)) {
        try { fs.rmSync(backup.backup_path, { recursive: true, force: true }); } catch (e) {}
      }
    }

    await db.query('DELETE FROM remote_backups WHERE id=?', [req.params.id]);
    res.json({ message: 'Backup deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

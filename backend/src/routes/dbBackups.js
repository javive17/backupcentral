const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const dbBackupService = require('../services/dbBackup');

router.get('/', auth, async (req, res) => {
  try {
    let query = `SELECT db2.*, dc.name as connection_name, dc.host
                 FROM database_backups db2
                 JOIN database_connections dc ON db2.connection_id = dc.id`;
    const params = [];
    if (req.query.connection_id) {
      query += ' WHERE db2.connection_id=?';
      params.push(req.query.connection_id);
    }
    if (req.query.status) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' db2.status=?';
      params.push(req.query.status);
    }
    query += ' ORDER BY db2.created_at DESC LIMIT 100';
    const backups = await db.query(query, params);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { connection_id, databases } = req.body;
    if (!connection_id) return res.status(400).json({ error: 'connection_id is required' });

    const conn = await db.queryOne('SELECT * FROM database_connections WHERE id=?', [connection_id]);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const dbsToBackup = databases || (conn.databases_to_backup ? conn.databases_to_backup.split(',').map(d => d.trim()) : ['all']);

    const result = await db.insert(
      `INSERT INTO database_backups (connection_id, database_name, status) VALUES (?, ?, 'pending')`,
      [connection_id, dbsToBackup.join(',')]
    );

    res.json({ id: result.insertId, message: 'Database backup started' });

    dbBackupService.createBackup(result.insertId, connection_id, dbsToBackup)
      .catch(err => console.error('Database backup failed:', err.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const backup = await db.queryOne('SELECT * FROM database_backups WHERE id=?', [req.params.id]);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    if (backup.backup_path) {
      const fs = require('fs');
      if (fs.existsSync(backup.backup_path)) {
        try { fs.rmSync(backup.backup_path, { recursive: true, force: true }); } catch (e) {}
      }
    }

    await db.query('DELETE FROM database_backups WHERE id=?', [req.params.id]);
    res.json({ message: 'Database backup deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const { encrypt } = require('../services/encryption');
const dbBackup = require('../services/dbBackup');

router.get('/', auth, async (req, res) => {
  try {
    const connections = await db.query(
      'SELECT id, name, host, port, username, databases_to_backup, description, enabled, last_backup_at, created_at FROM database_connections ORDER BY name'
    );
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const conn = await db.queryOne(
      'SELECT id, name, host, port, username, databases_to_backup, description, enabled, last_backup_at, created_at FROM database_connections WHERE id=?',
      [req.params.id]
    );
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const backups = await db.query(
      'SELECT * FROM database_backups WHERE connection_id=? ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ ...conn, backups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, host, port, username, password, databases_to_backup, description } = req.body;
    if (!name || !host || !username) return res.status(400).json({ error: 'Name, host, and username are required' });

    const passwordEncrypted = password ? encrypt(password) : null;
    const result = await db.insert(
      `INSERT INTO database_connections (name, host, port, username, password_encrypted, databases_to_backup, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, host, port || 3306, username, passwordEncrypted, databases_to_backup || '*', description || null]
    );

    res.json({ id: result.insertId, message: 'Database connection created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, host, port, username, password, databases_to_backup, description, enabled } = req.body;
    const existing = await db.queryOne('SELECT * FROM database_connections WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Connection not found' });

    const passwordEncrypted = password ? encrypt(password) : existing.password_encrypted;
    await db.query(
      `UPDATE database_connections SET name=?, host=?, port=?, username=?, password_encrypted=?, databases_to_backup=?, description=?, enabled=? WHERE id=?`,
      [name || existing.name, host || existing.host, port || existing.port, username || existing.username, passwordEncrypted, databases_to_backup !== undefined ? databases_to_backup : existing.databases_to_backup, description !== undefined ? description : existing.description, enabled !== undefined ? enabled : existing.enabled, req.params.id]
    );

    res.json({ message: 'Database connection updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM database_connections WHERE id=?', [req.params.id]);
    res.json({ message: 'Database connection deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/test', auth, async (req, res) => {
  try {
    const conn = await db.queryOne('SELECT * FROM database_connections WHERE id=?', [req.params.id]);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const result = await dbBackup.testConnection(conn);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
});

router.get('/:id/databases', auth, async (req, res) => {
  try {
    const conn = await db.queryOne('SELECT * FROM database_connections WHERE id=?', [req.params.id]);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const databases = await dbBackup.listDatabases(conn);
    res.json(databases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

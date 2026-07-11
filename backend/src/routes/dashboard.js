const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const [containerCount] = await db.query('SELECT COUNT(*) as count FROM containers');
    const [backupCount] = await db.query("SELECT COUNT(*) as count FROM backups WHERE status='completed'");
    const [scheduleCount] = await db.query('SELECT COUNT(*) as count FROM schedules WHERE enabled=1');
    const [runningCount] = await db.query("SELECT COUNT(*) as count FROM backups WHERE status='running'");

    const lastBackup = await db.queryOne(
      `SELECT b.*, c.name as container_name
       FROM backups b
       JOIN containers c ON b.container_id = c.id
       WHERE b.status='completed'
       ORDER BY b.completed_at DESC LIMIT 1`
    );

    const recentBackups = await db.query(
      `SELECT b.*, c.name as container_name
       FROM backups b
       JOIN containers c ON b.container_id = c.id
       ORDER BY b.created_at DESC LIMIT 10`
    );

    const failedToday = await db.queryOne(
      `SELECT COUNT(*) as count FROM backups
       WHERE status='failed' AND DATE(created_at) = CURDATE()`
    );

    const totalBackupSize = await db.queryOne(
      'SELECT COALESCE(SUM(backup_size), 0) as total FROM backups WHERE status="completed"'
    );

    res.json({
      containers: containerCount.count,
      completedBackups: backupCount.count,
      activeSchedules: scheduleCount.count,
      runningBackups: runningCount.count,
      lastBackup,
      recentBackups,
      failedToday: failedToday.count,
      totalBackupSize: totalBackupSize.total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

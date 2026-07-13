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

    const [remoteConnCount] = await db.query('SELECT COUNT(*) as count FROM remote_connections');
    const [remoteBackupCount] = await db.query("SELECT COUNT(*) as count FROM remote_backups WHERE status='completed'");
    const [remoteBackupSize] = await db.query('SELECT COALESCE(SUM(backup_size), 0) as total FROM remote_backups WHERE status="completed"');

    const [dbConnCount] = await db.query('SELECT COUNT(*) as count FROM database_connections');
    const [dbBackupCount] = await db.query("SELECT COUNT(*) as count FROM database_backups WHERE status='completed'");
    const [dbBackupSize] = await db.query('SELECT COALESCE(SUM(backup_size), 0) as total FROM database_backups WHERE status="completed"');

    const lastBackup = await db.queryOne(
      `SELECT b.*, c.name as container_name
       FROM backups b
       JOIN containers c ON b.container_id = c.id
       WHERE b.status='completed'
       ORDER BY b.completed_at DESC LIMIT 1`
    );

    const recentBackups = await db.query(
      `SELECT b.*, c.name as container_name, 'container' as source
       FROM backups b
       JOIN containers c ON b.container_id = c.id
       ORDER BY b.created_at DESC LIMIT 10`
    );

    const recentRemoteBackups = await db.query(
      `SELECT rb.*, rc.name as connection_name, rc.host, 'remote' as source
       FROM remote_backups rb
       JOIN remote_connections rc ON rb.connection_id = rc.id
       ORDER BY rb.created_at DESC LIMIT 10`
    );

    const recentDbBackups = await db.query(
      `SELECT db2.*, dc.name as connection_name, dc.host, 'database' as source
       FROM database_backups db2
       JOIN database_connections dc ON db2.connection_id = dc.id
       ORDER BY db2.created_at DESC LIMIT 10`
    );

    const allRecent = [...recentBackups, ...recentRemoteBackups, ...recentDbBackups]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);

    const failedToday = await db.queryOne(
      `SELECT COUNT(*) as count FROM backups
       WHERE status='failed' AND DATE(created_at) = CURDATE()`
    );
    const failedRemoteToday = await db.queryOne(
      `SELECT COUNT(*) as count FROM remote_backups
       WHERE status='failed' AND DATE(created_at) = CURDATE()`
    );
    const failedDbToday = await db.queryOne(
      `SELECT COUNT(*) as count FROM database_backups
       WHERE status='failed' AND DATE(created_at) = CURDATE()`
    );

    const totalBackupSize = await db.queryOne(
      'SELECT COALESCE(SUM(backup_size), 0) as total FROM backups WHERE status="completed"'
    );

    const totalSize = Number(totalBackupSize.total) + Number(remoteBackupSize.total) + Number(dbBackupSize.total);
    const totalCompleted = backupCount.count + remoteBackupCount.count + dbBackupCount.count;
    const totalFailedToday = failedToday.count + failedRemoteToday.count + failedDbToday.count;

    res.json({
      containers: containerCount.count,
      completedBackups: totalCompleted,
      activeSchedules: scheduleCount.count,
      runningBackups: runningCount.count,
      lastBackup,
      recentBackups: allRecent,
      failedToday: totalFailedToday,
      totalBackupSize: totalSize,
      remoteConnections: remoteConnCount.count,
      remoteBackups: remoteBackupCount.count,
      remoteBackupSize: Number(remoteBackupSize.total),
      dbConnections: dbConnCount.count,
      dbBackups: dbBackupCount.count,
      dbBackupSize: Number(dbBackupSize.total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

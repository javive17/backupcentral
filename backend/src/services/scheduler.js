const cron = require('node-cron');
const db = require('../db');
const backupService = require('./backup');

const activeJobs = new Map();

async function loadSchedules() {
  const schedules = await db.query(
    `SELECT s.*, c.portainer_id as cp_portainer_id, c.name as container_name
     FROM schedules s
     JOIN containers c ON s.container_id = c.id
     WHERE s.enabled = 1`
  );

  for (const schedule of schedules) {
    scheduleContainer(schedule);
  }
}

function scheduleContainer(schedule) {
  if (activeJobs.has(schedule.id)) {
    activeJobs.get(schedule.id).stop();
  }

  if (!cron.validate(schedule.cron_expression)) {
    console.error(`Invalid cron for schedule ${schedule.id}: ${schedule.cron_expression}`);
    return;
  }

  const job = cron.schedule(schedule.cron_expression, async () => {
    console.log(`Running scheduled backup: ${schedule.name || schedule.id}`);
    try {
      const [result] = await db.insert(
        `INSERT INTO backups (container_id, container_portainer_id, type, include_image, include_volumes, include_configs, include_filesystem, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          schedule.container_id,
          schedule.container_portainer_id,
          schedule.backup_type,
          schedule.include_image,
          schedule.include_volumes,
          schedule.include_configs,
          schedule.include_filesystem,
        ]
      );

      await backupService.createBackup(result.insertId, schedule.container_portainer_id, {
        type: schedule.backup_type,
        includeImage: !!schedule.include_image,
        includeVolumes: !!schedule.include_volumes,
        includeConfigs: !!schedule.include_configs,
        includeFilesystem: !!schedule.include_filesystem,
      });

      await db.query(
        `UPDATE schedules SET last_run=NOW() WHERE id=?`,
        [schedule.id]
      );
    } catch (err) {
      console.error(`Scheduled backup failed for ${schedule.name}: ${err.message}`);
    }
  });

  activeJobs.set(schedule.id, job);
}

function stopSchedule(scheduleId) {
  if (activeJobs.has(scheduleId)) {
    activeJobs.get(scheduleId).stop();
    activeJobs.delete(scheduleId);
  }
}

function stopAll() {
  for (const [id, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
}

module.exports = { loadSchedules, scheduleContainer, stopSchedule, stopAll, activeJobs };

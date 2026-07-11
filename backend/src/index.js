const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./db');
const scheduler = require('./services/scheduler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/containers', require('./routes/containers'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/restore', require('./routes/restore'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/settings', require('./routes/settings'));

app.use(express.static(config.frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(config.frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function start() {
  try {
    await db.getPool().getConnection();
    console.log('MySQL connected');

    await scheduler.loadSchedules();
    console.log('Schedules loaded');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Backup Central running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();

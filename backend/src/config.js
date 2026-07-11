require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3080,
  db: {
    host: process.env.DB_HOST || '10.0.0.249',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'backup_central',
    password: process.env.DB_PASSWORD || 'B@ckupC3ntr@l2026!',
    database: process.env.DB_NAME || 'backup_central',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  portainer: {
    url: process.env.PORTAINER_URL || 'http://10.0.0.249:9000',
    user: process.env.PORTAINER_USER || 'admin',
    password: process.env.PORTAINER_PASSWORD || 'Qwerty1234!@!',
  },
  backup: {
    root: process.env.BACKUP_ROOT || 'Z:\\BackupCentral',
    dockerData: process.env.DOCKER_DATA_PATH || 'Z:\\docker',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'e35ee2c907618935abc5d613b5481e5b730447089ce137a7217892e2ff048a4c',
    expiresIn: '24h',
  },
  frontendPath: path.join(__dirname, '..', '..', 'frontend', 'dist'),
};

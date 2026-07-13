const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const mysql = require('mysql2/promise');
const config = require('../config');
const db = require('../db');
const { decrypt } = require('./encryption');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function createDbConnection(connection) {
  return mysql.createConnection({
    host: connection.host,
    port: connection.port || 3306,
    user: connection.username,
    password: connection.password_encrypted ? decrypt(connection.password_encrypted) : '',
    connectTimeout: 15000,
    multipleStatements: true,
  });
}

function escapeId(name) {
  return '`' + name.replace(/`/g, '``') + '`';
}

function escapeVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function testConnection(connection) {
  const conn = await createDbConnection(connection);
  try {
    const [rows] = await conn.query('SELECT VERSION() as version, USER() as user');
    const [databases] = await conn.query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema','performance_schema','mysql','sys')");
    return {
      success: true,
      version: rows[0].version,
      user: rows[0].user,
      databases: databases.map(r => r.Database),
    };
  } finally {
    await conn.end();
  }
}

async function listDatabases(connection) {
  const conn = await createDbConnection(connection);
  try {
    const [databases] = await conn.query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema','performance_schema','mysql','sys')");
    return databases.map(r => r.Database);
  } finally {
    await conn.end();
  }
}

async function dumpDatabase(conn, databaseName) {
  const tables = [];
  const [tableRows] = await conn.query(`SHOW TABLES FROM ${escapeId(databaseName)}`);
  const tableNames = tableRows.map(r => Object.values(r)[0]);

  let sql = `-- Database: ${databaseName}\n`;
  sql += `-- Dumped: ${new Date().toISOString()}\n\n`;
  sql += `SET NAMES utf8mb4;\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  for (const tableName of tableNames) {
    const [createRow] = await conn.query(`SHOW CREATE TABLE ${escapeId(databaseName)}.${escapeId(tableName)}`);
    const createSql = createRow[0]['Create Table'] || createRow[0]['Create View'] || '';
    sql += `DROP TABLE IF EXISTS ${escapeId(tableName)};\n`;
    sql += `${createSql};\n\n`;

    const [columns] = await conn.query(`SHOW COLUMNS FROM ${escapeId(databaseName)}.${escapeId(tableName)}`);
    const colNames = columns.map(c => escapeId(c.Field));

    const [rows] = await conn.query(`SELECT * FROM ${escapeId(databaseName)}.${escapeId(tableName)}`);
    if (rows.length > 0) {
      sql += `INSERT INTO ${escapeId(tableName)} (${colNames.join(', ')}) VALUES\n`;
      const valueStrings = rows.map(row => {
        const vals = columns.map(c => escapeVal(row[c.Field]));
        return `  (${vals.join(', ')})`;
      });
      sql += valueStrings.join(',\n') + ';\n\n';
    }

    tables.push({ name: tableName, rows: rows.length });
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  return { sql, tables };
}

async function createBackup(backupId, connectionId, databaseNames) {
  try {
    await db.query(`UPDATE database_backups SET status='running', started_at=NOW() WHERE id=?`, [backupId]);

    const connRow = await db.queryOne(`SELECT * FROM database_connections WHERE id=?`, [connectionId]);
    if (!connRow) throw new Error('Connection not found');

    const backupDir = path.join(config.backup.root, 'databases', connRow.name);
    ensureDir(backupDir);
    const timestamp = getTimestamp();
    const backupPath = path.join(backupDir, `backup_${timestamp}`);
    ensureDir(backupPath);

    const dbConn = await createDbConnection(connRow);

    const databasesToDump = databaseNames || ['all'];
    let actualDatabases = databasesToDump;

    if (databasesToDump.includes('all')) {
      const [dbRows] = await dbConn.query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema','performance_schema','mysql','sys')");
      actualDatabases = dbRows.map(r => r.Database);
    }

    let totalSize = 0;
    const results = [];

    for (const dbName of actualDatabases) {
      try {
        console.log(`Dumping database: ${dbName}`);
        const { sql, tables } = await dumpDatabase(dbConn, dbName);

        const sqlPath = path.join(backupPath, `${dbName}.sql`);
        const gzPath = `${sqlPath}.gz`;
        fs.writeFileSync(sqlPath, sql);

        const gzip = zlib.createGzip();
        const input = fs.createReadStream(sqlPath);
        const output = fs.createWriteStream(gzPath);
        await pipeline(input, gzip, output);
        fs.unlinkSync(sqlPath);

        const size = fs.statSync(gzPath).size;
        totalSize += size;
        results.push({ database: dbName, tables: tables.length, totalRows: tables.reduce((s, t) => s + t.rows, 0), size });
      } catch (err) {
        console.error(`Failed to dump ${dbName}: ${err.message}`);
        results.push({ database: dbName, error: err.message });
      }
    }

    await dbConn.end();

    const manifest = {
      backupId,
      connectionId,
      connectionName: connRow.name,
      host: connRow.host,
      databases: results,
      timestamp,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

    await db.query(
      `UPDATE database_backups SET status='completed', backup_path=?, backup_size=?, completed_at=NOW() WHERE id=?`,
      [backupPath, totalSize, backupId]
    );

    await db.query(`UPDATE database_connections SET last_backup_at=NOW() WHERE id=?`, [connectionId]);

    return { success: true, backupPath, totalSize, databases: results };
  } catch (err) {
    await db.query(
      `UPDATE database_backups SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`,
      [err.message, backupId]
    );
    throw err;
  }
}

module.exports = { testConnection, listDatabases, createBackup };

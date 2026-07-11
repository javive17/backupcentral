const mysql = require('mysql2/promise');
const config = require('./config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config.db);
  }
  return pool;
}

async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function insert(sql, params = []) {
  const p = getPool();
  const [result] = await p.execute(sql, params);
  return result;
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, queryOne, insert, close };

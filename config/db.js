/**
 * DeadlineDeck - Database Connection & Query Pool
 * Uses mysql2/promise for prepared statements and transactional safety.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

let poolConfig;

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      dateStrings: true
    };
  } catch (e) {
    poolConfig = {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      dateStrings: true
    };
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'deadlinedeck',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true // Preserve exact YYYY-MM-DD date strings without timezone shift
  };
}

if (typeof poolConfig === 'object' && (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

let pool = null;

try {
  pool = mysql.createPool(poolConfig);
} catch (err) {
  console.error('[DB] Failed to create MySQL pool:', err.message);
}

/**
 * Execute a prepared SQL statement with parameter binding.
 * Always verifies parameters to eliminate SQL injection risks.
 */
async function query(sql, params = []) {
  if (!pool) {
    throw new Error('Database pool is not initialized. Please verify MySQL configuration.');
  }
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Health check to verify database connectivity.
 */
async function testConnection() {
  try {
    const [result] = await pool.execute('SELECT 1 AS connected');
    return { ok: true, message: 'MySQL connected successfully' };
  } catch (error) {
    return { 
      ok: false, 
      message: error.message,
      code: error.code
    };
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  poolConfig
};

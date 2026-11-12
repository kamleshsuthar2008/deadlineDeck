/**
 * DeadlineDeck - Database Connection Health Check
 * Validates connection to MySQL and executes SELECT 1.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const database = process.env.DB_NAME || 'deadlinedeck';

  console.log('='.repeat(55));
  console.log('   DEADLINEDECK — DATABASE CONNECTIVITY CHECK');
  console.log('='.repeat(55));
  console.log(`Target:    ${user}@${host}:${port}/${database}`);

  const startTime = Date.now();
  let connection;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password: process.env.DB_PASSWORD || '',
      database
    });

    const [rows] = await connection.query('SELECT 1 AS connected, NOW() AS server_time, VERSION() AS mysql_version');
    const elapsed = Date.now() - startTime;

    console.log('Status:    ✓ CONNECTED SUCCESSFULLY');
    console.log(`Version:   MySQL ${rows[0].mysql_version}`);
    console.log(`Time:      ${rows[0].server_time}`);
    console.log(`Latency:   ${elapsed}ms`);
    console.log('='.repeat(55));
    console.log('Database check passed.');
    process.exit(0);
  } catch (err) {
    console.error('\nStatus:    ✗ CONNECTION FAILED');
    console.error(`Error:     [${err.code || 'UNKNOWN'}] ${err.message}`);
    console.error('-'.repeat(55));

    if (err.code === 'ECONNREFUSED') {
      console.error('Diagnosis: MySQL service is not running or port is blocked.');
      console.error('Action:    Verify MySQL service is started (e.g. net start MySQL80 or XAMPP).');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Diagnosis: Invalid credentials.');
      console.error('Action:    Check DB_USER and DB_PASSWORD in your .env file.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error(`Diagnosis: Database '${database}' does not exist.`);
      console.error('Action:    Run "npm run db:setup" to initialize the database schema.');
    } else {
      console.error('Action:    Verify network and database server configuration in .env.');
    }
    console.error('='.repeat(55));
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

checkDatabase();

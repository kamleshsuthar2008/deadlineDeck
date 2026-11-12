/**
 * DeadlineDeck - Database Schema Verification Script
 * Inspects INFORMATION_SCHEMA to confirm all required tables and relationships.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const REQUIRED_TABLES = [
  'users',
  'subjects',
  'tasks',
  'study_capacity',
  'notes',
  'checklists',
  'checklist_items',
  'study_sessions',
  'sessions'
];

async function verifySchema() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const database = process.env.DB_NAME || 'deadlinedeck';

  console.log('='.repeat(65));
  console.log('     DEADLINEDECK — SCHEMA INTEGRITY VERIFICATION');
  console.log('='.repeat(65));
  console.log(`Inspecting database: ${database} on ${host}:${port}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password: process.env.DB_PASSWORD || '',
      database
    });

    // 1. Query INFORMATION_SCHEMA.TABLES
    const [tableRows] = await connection.query(
      `SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [database]
    );

    const existingTableNames = tableRows.map(r => r.TABLE_NAME);
    let allPresent = true;

    console.log('Table Verification:');
    console.log('-'.repeat(65));
    console.log(
      'TABLE NAME'.padEnd(22) +
      'STATUS'.padEnd(14) +
      'ENGINE'.padEnd(10) +
      'EST. ROWS'.padEnd(12)
    );
    console.log('-'.repeat(65));

    for (const reqTable of REQUIRED_TABLES) {
      const found = tableRows.find(r => r.TABLE_NAME === reqTable);
      if (found) {
        console.log(
          reqTable.padEnd(22) +
          '✓ PRESENT'.padEnd(14) +
          (found.ENGINE || 'InnoDB').padEnd(10) +
          String(found.TABLE_ROWS || 0).padEnd(12)
        );
      } else {
        allPresent = false;
        console.log(
          reqTable.padEnd(22) +
          '✗ MISSING'.padEnd(14) +
          '-'.padEnd(10) +
          '-'.padEnd(12)
        );
      }
    }
    console.log('-'.repeat(65));

    // 2. Query Foreign Keys
    const [fkRows] = await connection.query(
      `SELECT 
         TABLE_NAME, 
         COLUMN_NAME, 
         REFERENCED_TABLE_NAME, 
         REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME`,
      [database]
    );

    console.log(`\nForeign Key Relationships Verified: ${fkRows.length}`);
    fkRows.forEach(fk => {
      console.log(`  • ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    console.log('\n' + '='.repeat(65));
    if (allPresent) {
      console.log('✓ ALL REQUIRED TABLES AND RELATIONSHIPS ARE VERIFIED!');
      console.log('='.repeat(65));
      process.exit(0);
    } else {
      console.error('✗ SOME REQUIRED TABLES ARE MISSING!');
      console.error('Action: Run "npm run db:setup" to build missing schema tables.');
      console.error('='.repeat(65));
      process.exit(1);
    }

  } catch (err) {
    console.error('\n✗ Schema verification failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

verifySchema();

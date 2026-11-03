/**
 * DeadlineDeck - Database Setup & Auto-Migrate Script
 * Runs schema.sql and seed.sql directly via mysql2.
 * Eliminates PowerShell '<' redirection issues.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runSetup() {
  console.log('[DB Setup] Connecting to MySQL server...');
  console.log(`[DB Setup] Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  console.log(`[DB Setup] User: ${process.env.DB_USER || 'root'}`);

  let connection;
  try {
    // 1. Connect without selecting database to ensure DB can be created
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('[DB Setup] Connected successfully to MySQL server.');

    // 2. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('[DB Setup] Executing schema.sql (creating database & tables)...');
    await connection.query(schemaSql);
    console.log('[DB Setup] ✓ Schema applied successfully.');

    // 3. Read and execute seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      console.log('[DB Setup] Executing seed.sql (inserting believable demo data)...');
      await connection.query(seedSql);
      console.log('[DB Setup] ✓ Demo data seeded successfully.');
    }

    console.log('\n[DB Setup] ========================================');
    console.log('[DB Setup] Database setup completed successfully!');
    console.log('[DB Setup] You can now start the app with: npm start');
    console.log('[DB Setup] ========================================\n');

  } catch (err) {
    console.error('\n[DB Setup Error]:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[DB Setup Tip] Check your password in .env (DB_PASSWORD=...)');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('[DB Setup Tip] MySQL server is not running on localhost:3306. Please start MySQL / XAMPP.');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runSetup();

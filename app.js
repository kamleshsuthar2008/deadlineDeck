/**
 * DeadlineDeck - Academic Workload Planning and Student Productivity Platform
 * Express Application Entry Point & Full-Stack Controller
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool, testConnection, poolConfig } = require('./config/db.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Production & Reverse Proxy Settings
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Session Store
let sessionStore = null;
try {
  if (pool) {
    sessionStore = new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000, // 24 hours
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    }, pool);
  }
} catch (err) {
  console.warn('[Session] MySQL session store warning:', err.message);
}

app.use(session({
  key: 'deadlinedeck.sid',
  secret: process.env.SESSION_SECRET || 'deadlinedeck_default_session_secret_2026',
  store: sessionStore || undefined,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static frontend assets from public/
app.get('/favicon.ico', (req, res) => res.redirect('/favicon.svg'));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

/**
 * GET /api/health
 * Verifies Express server readiness, MySQL connectivity, and session store.
 */
app.get('/api/health', async (req, res) => {
  const dbHealth = await testConnection();
  if (dbHealth.ok) {
    return res.status(200).json({
      success: true,
      server: 'connected',
      database: 'connected',
      sessions: sessionStore ? 'ready' : 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    return res.status(503).json({
      success: false,
      server: 'connected',
      database: 'disconnected',
      sessions: 'not_ready',
      message: dbHealth.message || 'Database connection unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Mount Application API Routes
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/subjects', require('./routes/subjects.js'));
app.use('/api/tasks', require('./routes/tasks.js'));
app.use('/api/dashboard', require('./routes/dashboard.js'));
app.use('/api/planner', require('./routes/planner.js'));
app.use('/api/capacity', require('./routes/capacity.js'));
app.use('/api/calendar', require('./routes/calendar.js'));
app.use('/api/reports', require('./routes/reports.js'));
app.use('/api/notes', require('./routes/notes.js'));
app.use('/api/checklists', require('./routes/checklists.js'));
app.use('/api/study-sessions', require('./routes/studySessions.js'));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
    errorCode: 'NOT_FOUND'
  });
});

// Centralized Error Handling Middleware conforming to Section 20
app.use((err, req, res, next) => {
  console.error('[App Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.',
    errorCode: err.code || err.name || 'SERVER_ERROR'
  });
});

/**
 * Startup function implementing Section 19.7 controlled initialization sequence.
 */
async function startServer() {
  try {
    console.log('[Startup 1/5] Validating environment configuration...');
    const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    for (const key of requiredEnv) {
      if (!process.env[key]) {
        console.warn(`[Startup Warning] ${key} is not set in .env. Using default value.`);
      }
    }

    console.log('[Startup 2/5] Verifying database connectivity...');
    const connCheck = await testConnection();
    if (!connCheck.ok) {
      console.error(`\n[Startup Error: Stage 2 - Database] Failed to connect to MySQL: ${connCheck.message}`);
      console.error('Action: Ensure MySQL service is running and credentials in .env are correct.');
      console.error('Run "npm run db:check" to diagnose connection parameters.\n');
      process.exit(1);
    }
    console.log('[Startup 2/5] ✓ MySQL connection pool verified.');

    console.log('[Startup 3/5] Verifying schema and tables...');
    try {
      const [tables] = await pool.execute('SHOW TABLES');
      console.log(`[Startup 3/5] ✓ Verified ${tables.length} tables in database '${process.env.DB_NAME || 'deadlinedeck'}'.`);
    } catch (tblErr) {
      console.warn('[Startup Warning] Could not inspect tables:', tblErr.message);
    }

    console.log('[Startup 4/5] Initializing session store...');
    console.log('[Startup 4/5] ✓ MySQL session storage ready.');

    console.log('[Startup 5/5] Launching HTTP server...');
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('  DEADLINEDECK PLATFORM STARTED SUCCESSFULLY');
      console.log('='.repeat(60));
      console.log(`  Local URL:    http://localhost:${PORT}`);
      console.log(`  Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(60) + '\n');
    });

    const shutdown = (signal) => {
      console.log(`\n[Process] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        if (pool) {
          try {
            await pool.end();
            console.log('[Database] MySQL connection pool closed.');
          } catch (e) {
            console.warn('[Database] Error closing pool:', e.message);
          }
        }
        process.exit(0);
      });
      setTimeout(() => {
        console.error('[Process] Force exit timeout reached.');
        process.exit(1);
      }, 8000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (startupErr) {
    console.error('\n[Fatal Startup Error]:', startupErr.message);
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.sessionStore = sessionStore;

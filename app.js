/**
 * DeadlineDeck - Academic Workload Planning and Student Productivity Platform
 * Express Application Entry Point
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool, poolConfig, testConnection } = require('./config/db.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store Setup (MySQL backed with graceful in-memory fallback)
let sessionStore = null;
try {
  if (pool) {
    sessionStore = new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000, // 1 day
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
  console.warn('[Session] MySQL session store warning, using default in-memory store:', err.message);
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

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
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
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[App Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'Server error',
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[DeadlineDeck] Platform server running on http://localhost:${PORT}`);
    console.log(`[DeadlineDeck] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;

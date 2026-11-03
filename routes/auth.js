const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Register a new student account
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, default_study_hours } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Validation error', message: 'Student name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Validation error', message: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Validation error', message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const existing = await query('SELECT user_id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Duplicate email', 
        message: 'An account with this email address already exists. Please sign in instead.' 
      });
    }

    // Hash password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const studyHours = Number(default_study_hours) > 0 ? Number(default_study_hours) : 4.00;

    const result = await query(
      'INSERT INTO users (name, email, password_hash, default_study_hours) VALUES (?, ?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash, studyHours]
    );

    const newUserId = result.insertId;

    // Seed initial CSE subjects for new student
    const defaultSubjects = [
      ['Database Management Systems', 'CS301'],
      ['Operating Systems', 'CS302'],
      ['Web Development', 'CS303'],
      ['Data Structures & Algorithms', 'CS304']
    ];
    for (const [subName, subCode] of defaultSubjects) {
      await query(
        'INSERT INTO subjects (user_id, subject_name, subject_code) VALUES (?, ?, ?)',
        [newUserId, subName, subCode]
      );
    }

    // Regenerate session to prevent fixation
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = newUserId;
      res.status(201).json({
        success: true,
        message: 'Registration successful.',
        user: {
          user_id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          default_study_hours: studyHours
        }
      });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate student credentials
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation error', message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rows = await query(
      'SELECT user_id, name, email, password_hash, default_study_hours FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'Incorrect email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'Incorrect email or password.' });
    }

    // Regenerate session on login
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.user_id;
      res.json({
        success: true,
        message: 'Sign-in successful.',
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          default_study_hours: Number(user.default_study_hours)
        }
      });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Terminate session & clear cookies
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to log out cleanly.' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully.' });
    });
  } else {
    res.json({ success: true, message: 'No active session.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieve authenticated student profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT user_id, name, email, default_study_hours, created_at FROM users WHERE user_id = ?',
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = rows[0];
    res.json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      default_study_hours: Number(user.default_study_hours),
      created_at: user.created_at
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/profile
 * Update student profile name and default study hours
 */
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, default_study_hours } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Validation error', message: 'Name cannot be blank.' });
    }

    const hours = Number(default_study_hours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      return res.status(400).json({ error: 'Validation error', message: 'Default study hours must be between 0.25 and 24.' });
    }

    await query(
      'UPDATE users SET name = ?, default_study_hours = ? WHERE user_id = ?',
      [name.trim(), hours, req.userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        name: name.trim(),
        default_study_hours: hours
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Both current and new passwords are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const rows = await query('SELECT password_hash FROM users WHERE user_id = ?', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, req.userId]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

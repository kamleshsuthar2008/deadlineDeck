const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

/**
 * GET /api/study-sessions
 * Retrieve completed study focus sessions
 */
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        ss.session_id,
        ss.task_id,
        t.title AS task_title,
        s.subject_code,
        ss.planned_date,
        ss.duration_minutes,
        ss.completed_at
      FROM study_sessions ss
      LEFT JOIN tasks t ON ss.task_id = t.task_id AND t.user_id = ss.user_id
      LEFT JOIN subjects s ON t.subject_id = s.subject_id
      WHERE ss.user_id = ?
      ORDER BY ss.completed_at DESC
      LIMIT 50
    `;
    const rows = await query(sql, [req.userId]);
    const sessions = rows.map(r => ({
      ...r,
      planned_date: typeof r.planned_date === 'string' ? r.planned_date.substring(0, 10) : new Date(r.planned_date).toISOString().substring(0, 10),
      duration_minutes: Number(r.duration_minutes)
    }));

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/study-sessions
 * Log a completed focus study session
 */
router.post('/', async (req, res, next) => {
  try {
    const { task_id, duration_minutes } = req.body;

    const duration = Number(duration_minutes);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ error: 'Duration in minutes must be greater than zero.' });
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const taskId = task_id ? Number(task_id) : null;

    const result = await query(
      'INSERT INTO study_sessions (user_id, task_id, planned_date, duration_minutes) VALUES (?, ?, ?, ?)',
      [req.userId, taskId, todayStr, duration]
    );

    res.status(201).json({
      success: true,
      message: 'Study session logged.',
      session_id: result.insertId,
      duration_minutes: duration
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

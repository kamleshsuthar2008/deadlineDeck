const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

function toDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
      planned_date: String(r.planned_date).substring(0, 10),
      duration_minutes: Number(r.duration_minutes)
    }));

    res.json({
      success: true,
      message: 'Study sessions retrieved successfully.',
      sessions,
      data: { sessions }
    });
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
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Duration in minutes must be greater than zero.'
      });
    }

    const todayStr = toDateString(new Date());
    const taskId = task_id ? Number(task_id) : null;

    const result = await query(
      'INSERT INTO study_sessions (user_id, task_id, planned_date, duration_minutes) VALUES (?, ?, ?, ?)',
      [req.userId, taskId, todayStr, duration]
    );

    const newSession = {
      session_id: result.insertId,
      task_id: taskId,
      planned_date: todayStr,
      duration_minutes: duration
    };

    res.status(201).json({
      success: true,
      message: 'Study session logged successfully.',
      ...newSession,
      data: newSession
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

/**
 * GET /api/calendar
 * Calendar events distinguishing planned study dates from submission deadlines
 */
router.get('/', async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    // Compute month boundary
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const sql = `
      SELECT 
        t.task_id,
        t.title,
        t.task_type,
        t.due_date,
        t.planned_date,
        t.estimated_hours,
        t.priority,
        t.status,
        s.subject_code,
        s.subject_name
      FROM tasks t
      JOIN subjects s ON t.subject_id = s.subject_id
      WHERE t.user_id = ?
        AND (
          t.planned_date BETWEEN ? AND ?
          OR t.due_date BETWEEN ? AND ?
        )
      ORDER BY t.due_date ASC
    `;

    const rows = await query(sql, [req.userId, startStr, endStr, startStr, endStr]);

    const events = rows.map(r => ({
      ...r,
      due_date: String(r.due_date).substring(0, 10),
      planned_date: String(r.planned_date).substring(0, 10),
      estimated_hours: Number(r.estimated_hours)
    }));

    const calendarData = {
      year,
      month,
      start_date: startStr,
      end_date: endStr,
      events
    };

    res.json({
      success: true,
      message: 'Calendar events retrieved successfully.',
      ...calendarData,
      data: calendarData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');
const { calculateDayWorkload } = require('../services/workloadService.js');

router.use(requireAuth);

/**
 * GET /api/planner/day/:date
 * Retrieve tasks and capacity calculation for a specific day
 */
router.get('/day/:date', async (req, res, next) => {
  try {
    const dateStr = req.params.date.substring(0, 10);

    // 1. Fetch capacity
    const capRows = await query('SELECT available_hours FROM study_capacity WHERE user_id = ? AND capacity_date = ?', [req.userId, dateStr]);
    let availableHours = null;

    if (capRows.length > 0) {
      availableHours = Number(capRows[0].available_hours);
    } else {
      const userRows = await query('SELECT default_study_hours FROM users WHERE user_id = ?', [req.userId]);
      availableHours = Number(userRows[0]?.default_study_hours || 4.00);
    }

    // 2. Fetch tasks planned for this date
    const tasksSql = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.task_type,
        t.due_date,
        t.planned_date,
        t.estimated_hours,
        t.priority,
        t.status,
        s.subject_name,
        s.subject_code
      FROM tasks t
      JOIN subjects s ON t.subject_id = s.subject_id
      WHERE t.user_id = ? AND t.planned_date = ?
      ORDER BY t.priority DESC, t.due_date ASC
    `;
    const tasks = await query(tasksSql, [req.userId, dateStr]);

    const workload = calculateDayWorkload(tasks, availableHours, dateStr);

    res.json({
      date: dateStr,
      workload,
      tasks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/planner/tasks/:id/reschedule
 * Reschedule the planned study date of a task
 * Preserves the actual submission due_date intact!
 */
router.patch('/tasks/:id/reschedule', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { new_planned_date } = req.body;

    if (!new_planned_date) {
      return res.status(400).json({ error: 'New planned study date is required.' });
    }

    const cleanDate = new_planned_date.substring(0, 10);

    // Verify ownership
    const taskRows = await query('SELECT task_id, planned_date, due_date FROM tasks WHERE task_id = ? AND user_id = ?', [taskId, req.userId]);
    if (taskRows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await query('UPDATE tasks SET planned_date = ? WHERE task_id = ? AND user_id = ?', [cleanDate, taskId, req.userId]);

    res.json({
      success: true,
      message: `Task rescheduled to ${cleanDate}.`,
      task_id: taskId,
      new_planned_date: cleanDate
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

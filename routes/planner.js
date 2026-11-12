const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');
const { calculateDayWorkload } = require('../services/workloadService.js');

router.use(requireAuth);

/**
 * Format Date object to YYYY-MM-DD
 */
function toDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate dates for a 7-day Monday-to-Sunday week based on an offset.
 */
function getWeekDays(offset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday + (offset * 7));
  monday.setHours(0, 0, 0, 0);

  const days = [];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    days.push({
      dateStr: toDateString(current),
      weekday: weekdays[i],
      dayNum: current.getDate(),
      monthShort: current.toLocaleString('en-US', { month: 'short' })
    });
  }
  return days;
}

/**
 * GET /api/planner/week
 * Retrieve full weekly plan with day-by-day tasks and capacity utilization
 */
router.get('/week', async (req, res, next) => {
  try {
    const offset = Number(req.query.week_offset) || 0;
    const weekDays = getWeekDays(offset);
    const startDate = weekDays[0].dateStr;
    const endDate = weekDays[6].dateStr;
    const todayStr = toDateString(new Date());

    const userRows = await query('SELECT default_study_hours FROM users WHERE user_id = ?', [req.userId]);
    const defaultCapacity = Number(userRows[0]?.default_study_hours || 4.00);

    const capacityRows = await query(
      'SELECT capacity_date, available_hours FROM study_capacity WHERE user_id = ? AND capacity_date BETWEEN ? AND ?',
      [req.userId, startDate, endDate]
    );
    const capacityMap = {};
    for (const row of capacityRows) {
      const d = typeof row.capacity_date === 'string' ? row.capacity_date.substring(0, 10) : toDateString(new Date(row.capacity_date));
      capacityMap[d] = Number(row.available_hours);
    }

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
        s.subject_code,
        s.subject_name
      FROM tasks t
      JOIN subjects s ON t.subject_id = s.subject_id
      WHERE t.user_id = ? AND t.planned_date BETWEEN ? AND ?
      ORDER BY t.planned_date ASC, t.priority DESC, t.due_date ASC
    `;
    const tasks = await query(tasksSql, [req.userId, startDate, endDate]);

    const days = weekDays.map(day => {
      const dayCapacity = capacityMap[day.dateStr] !== undefined ? capacityMap[day.dateStr] : defaultCapacity;
      const dayTasks = tasks.filter(t => {
        const pd = typeof t.planned_date === 'string' ? t.planned_date.substring(0, 10) : toDateString(new Date(t.planned_date));
        return pd === day.dateStr;
      });

      const calculation = calculateDayWorkload(dayTasks, dayCapacity, day.dateStr);

      return {
        ...day,
        is_today: day.dateStr === todayStr,
        ...calculation,
        tasks: dayTasks
      };
    });

    const plannerData = {
      week_offset: offset,
      start_date: startDate,
      end_date: endDate,
      days
    };

    res.json({
      success: true,
      message: 'Weekly planner retrieved successfully.',
      ...plannerData,
      data: plannerData
    });
  } catch (err) {
    next(err);
  }
});

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

    const dayData = {
      date: dateStr,
      workload,
      tasks
    };

    res.json({
      success: true,
      message: 'Day plan retrieved successfully.',
      ...dayData,
      data: dayData
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
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'New planned study date is required.'
      });
    }

    const cleanDate = new_planned_date.substring(0, 10);

    // Verify ownership
    const taskRows = await query('SELECT task_id, planned_date, due_date FROM tasks WHERE task_id = ? AND user_id = ?', [taskId, req.userId]);
    if (taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Task not found.'
      });
    }

    await query('UPDATE tasks SET planned_date = ? WHERE task_id = ? AND user_id = ?', [cleanDate, taskId, req.userId]);

    res.json({
      success: true,
      message: `Task rescheduled to ${cleanDate}.`,
      task_id: taskId,
      new_planned_date: cleanDate,
      data: { task_id: taskId, new_planned_date: cleanDate }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

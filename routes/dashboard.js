const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');
const { calculateDayWorkload } = require('../services/workloadService.js');
const { rankTasks } = require('../services/priorityService.js');

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
  // Adjust day to Monday: in JS Sunday=0, Monday=1, ... Saturday=6
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7; // days since Monday

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
 * GET /api/dashboard/summary
 * Primary operational statistics and focus recommendations
 */
router.get('/summary', async (req, res, next) => {
  try {
    const todayStr = toDateString(new Date());

    // 1. Fetch user profile
    const userRows = await query('SELECT name, default_study_hours FROM users WHERE user_id = ?', [req.userId]);
    const user = userRows[0] || { name: 'Student', default_study_hours: 4.00 };

    // 2. Overview Ribbon Metrics
    const countsSql = `
      SELECT
        COUNT(CASE WHEN status != 'Completed' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN status != 'Completed' AND due_date = ? THEN 1 END) AS due_today_count,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS completed_count,
        COUNT(CASE WHEN status != 'Completed' AND due_date < ? THEN 1 END) AS overdue_count
      FROM tasks
      WHERE user_id = ?
    `;
    const countRows = await query(countsSql, [todayStr, todayStr, req.userId]);
    const c = countRows[0];

    const pendingCount = Number(c.pending_count);
    const dueTodayCount = Number(c.due_today_count);
    const completedCount = Number(c.completed_count);
    const overdueCount = Number(c.overdue_count);

    const totalTracked = pendingCount + completedCount;
    const completionRate = totalTracked > 0 ? Math.round((completedCount / totalTracked) * 100) : 0;

    // 3. Fetch all active tasks with subjects for ranking and timeline
    const tasksSql = `
      SELECT 
        t.task_id,
        t.title,
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
      WHERE t.user_id = ?
      ORDER BY t.due_date ASC
    `;
    const allTasks = await query(tasksSql, [req.userId]);

    // Today's Focus using Smart Priority System
    const rankedFocusTasks = rankTasks(allTasks, todayStr).slice(0, 5);

    // Upcoming Deadlines (next 5 pending tasks sorted by due_date)
    const upcomingDeadlines = allTasks
      .filter(t => t.status !== 'Completed')
      .slice(0, 5)
      .map(t => ({
        task_id: t.task_id,
        title: t.title,
        subject_code: t.subject_code,
        task_type: t.task_type,
        due_date: typeof t.due_date === 'string' ? t.due_date.substring(0, 10) : toDateString(new Date(t.due_date)),
        estimated_hours: Number(t.estimated_hours)
      }));

    // Subject-wise Workload Distribution
    const subjectSql = `
      SELECT 
        s.subject_id,
        s.subject_code,
        s.subject_name,
        COALESCE(SUM(CASE WHEN t.status != 'Completed' THEN t.estimated_hours ELSE 0 END), 0) AS pending_hours,
        COUNT(CASE WHEN t.status != 'Completed' THEN 1 END) AS pending_count
      FROM subjects s
      LEFT JOIN tasks t ON s.subject_id = t.subject_id AND t.user_id = s.user_id
      WHERE s.user_id = ?
      GROUP BY s.subject_id
      HAVING pending_hours > 0
      ORDER BY pending_hours DESC
    `;
    const subjectWorkloadRows = await query(subjectSql, [req.userId]);
    const subjectWorkload = subjectWorkloadRows.map(r => ({
      subject_id: r.subject_id,
      subject_code: r.subject_code,
      subject_name: r.subject_name,
      pending_hours: Number(Number(r.pending_hours).toFixed(2)),
      pending_count: Number(r.pending_count)
    }));

    // Today's Workload Calculation
    const capacityRows = await query('SELECT available_hours FROM study_capacity WHERE user_id = ? AND capacity_date = ?', [req.userId, todayStr]);
    const todayCapacity = capacityRows.length > 0 ? Number(capacityRows[0].available_hours) : Number(user.default_study_hours);
    const todayWorkload = calculateDayWorkload(allTasks, todayCapacity, todayStr);

    const responseData = {
      student_name: user.name,
      today_date: todayStr,
      ribbon: {
        pending_tasks: pendingCount,
        due_today: dueTodayCount,
        completed_tasks: completedCount,
        overdue_tasks: overdueCount,
        completion_rate: completionRate
      },
      today_focus: rankedFocusTasks,
      upcoming_deadlines: upcomingDeadlines,
      subject_workload: subjectWorkload,
      today_workload: todayWorkload
    };

    res.json({
      success: true,
      message: 'Dashboard summary retrieved successfully.',
      ...responseData,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/workload
 * Seven-day Workload Map calculation
 */
router.get('/workload', async (req, res, next) => {
  try {
    const offset = Number(req.query.week_offset) || 0;
    const weekDays = getWeekDays(offset);
    const startDate = weekDays[0].dateStr;
    const endDate = weekDays[6].dateStr;
    const todayStr = toDateString(new Date());

    // 1. Fetch user default capacity
    const userRows = await query('SELECT default_study_hours FROM users WHERE user_id = ?', [req.userId]);
    const defaultCapacity = Number(userRows[0]?.default_study_hours || 4.00);

    // 2. Fetch date-specific capacities for this week
    const capacityRows = await query(
      'SELECT capacity_date, available_hours FROM study_capacity WHERE user_id = ? AND capacity_date BETWEEN ? AND ?',
      [req.userId, startDate, endDate]
    );
    const capacityMap = {};
    for (const row of capacityRows) {
      const d = typeof row.capacity_date === 'string' ? row.capacity_date.substring(0, 10) : toDateString(new Date(row.capacity_date));
      capacityMap[d] = Number(row.available_hours);
    }

    // 3. Fetch all tasks with planned_date within this week
    const tasksSql = `
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
      WHERE t.user_id = ? AND t.planned_date BETWEEN ? AND ?
      ORDER BY t.planned_date ASC, t.priority DESC
    `;
    const tasks = await query(tasksSql, [req.userId, startDate, endDate]);

    // 4. Calculate day-wise workload for each of the 7 days
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
        ...calculation
      };
    });

    const workloadData = {
      week_offset: offset,
      start_date: startDate,
      end_date: endDate,
      days
    };

    res.json({
      success: true,
      message: 'Weekly workload calculated successfully.',
      ...workloadData,
      data: workloadData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');
const { calculateDayWorkload } = require('../services/workloadService.js');

router.use(requireAuth);

function toDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/overview', async (req, res, next) => {
  try {
    const todayStr = toDateString(new Date());

    // 1. Overview counts
    const countsSql = `
      SELECT 
        COUNT(task_id) AS total_tasks,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN status != 'Completed' THEN 1 END) AS pending_tasks,
        COUNT(CASE WHEN status != 'Completed' AND due_date < ? THEN 1 END) AS overdue_tasks
      FROM tasks
      WHERE user_id = ?
    `;
    const countRows = await query(countsSql, [todayStr, req.userId]);
    const total = Number(countRows[0].total_tasks);
    const completed = Number(countRows[0].completed_tasks);
    const pending = Number(countRows[0].pending_tasks);
    const overdue = Number(countRows[0].overdue_tasks);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 2. Subject distribution
    const subSql = `
      SELECT 
        s.subject_code,
        s.subject_name,
        COUNT(t.task_id) AS total_tasks,
        COUNT(CASE WHEN t.status = 'Completed' THEN 1 END) AS completed_tasks,
        COALESCE(SUM(CASE WHEN t.status != 'Completed' THEN t.estimated_hours ELSE 0 END), 0) AS pending_hours
      FROM subjects s
      LEFT JOIN tasks t ON s.subject_id = t.subject_id AND t.user_id = s.user_id
      WHERE s.user_id = ?
      GROUP BY s.subject_id
      ORDER BY total_tasks DESC
    `;
    const subjectRows = await query(subSql, [req.userId]);
    const subjectDistribution = subjectRows.map(r => ({
      ...r,
      total_tasks: Number(r.total_tasks),
      completed_tasks: Number(r.completed_tasks),
      pending_hours: Number(Number(r.pending_hours).toFixed(2))
    }));

    // 3. User default capacity
    const userRows = await query('SELECT default_study_hours FROM users WHERE user_id = ?', [req.userId]);
    const defaultHours = Number(userRows[0]?.default_study_hours || 4.00);

    // 4. Overloaded days in the last 30 days
    const monthTasksSql = `
      SELECT planned_date, estimated_hours, status
      FROM tasks
      WHERE user_id = ? 
        AND planned_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND status != 'Completed'
    `;
    const monthTasks = await query(monthTasksSql, [req.userId]);

    const monthCapSql = `
      SELECT capacity_date, available_hours
      FROM study_capacity
      WHERE user_id = ? AND capacity_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    const monthCapRows = await query(monthCapSql, [req.userId]);
    const capMap = {};
    for (const r of monthCapRows) {
      const d = String(r.capacity_date).substring(0, 10);
      capMap[d] = Number(r.available_hours);
    }

    // Group tasks by planned_date
    const dayTasksMap = {};
    for (const t of monthTasks) {
      const d = String(t.planned_date).substring(0, 10);
      if (!dayTasksMap[d]) dayTasksMap[d] = [];
      dayTasksMap[d].push(t);
    }

    let overloadedDaysCount = 0;
    for (const [d, tList] of Object.entries(dayTasksMap)) {
      const cap = capMap[d] !== undefined ? capMap[d] : defaultHours;
      const calc = calculateDayWorkload(tList, cap, d);
      if (calc.status_code === 'overloaded') {
        overloadedDaysCount++;
      }
    }

    // Editorial plain language summary
    let editorialSummary = '';
    if (total === 0) {
      editorialSummary = 'No tasks recorded yet. Start by adding your active academic tasks to generate workload insights.';
    } else {
      editorialSummary = `You have completed ${completed} of ${total} recorded tasks (${completionRate}%). `;
      if (overloadedDaysCount > 0) {
        editorialSummary += `Over the last 30 days, ${overloadedDaysCount} day${overloadedDaysCount === 1 ? '' : 's'} exceeded your study capacity threshold.`;
      } else {
        editorialSummary += 'Your study schedule has maintained balanced workload pressure across the past 30 days.';
      }
    }

    const reportData = {
      summary: {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pending,
        overdue_tasks: overdue,
        completion_rate: completionRate,
        overloaded_days_past_month: overloadedDaysCount
      },
      editorial_summary: editorialSummary,
      subject_distribution: subjectDistribution
    };

    res.json({
      success: true,
      message: 'Overview reports retrieved successfully.',
      ...reportData,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

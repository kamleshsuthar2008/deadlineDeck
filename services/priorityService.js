/**
 * DeadlineDeck - Smart Rule-Based Task Ranking Service
 * 
 * Transparent, deterministic ranking for "Today's Focus" / Recommended Tasks.
 * Rules:
 * 1. Overdue tasks (due_date < today and status != 'Completed')
 * 2. Tasks due today (due_date == today)
 * 3. Nearest deadlines (due within next 3 days)
 * 4. High priority tasks
 * 5. Tasks currently In Progress
 * 6. Other upcoming tasks
 * 
 * Tie-breakers:
 * - Earlier due date
 * - Higher priority (High > Medium > Low)
 * - Larger estimated hours (descending)
 * - Title alphabetical
 */

const PRIORITY_WEIGHTS = {
  High: 3,
  Medium: 2,
  Low: 1
};

/**
 * Return difference in calendar days between dateStr and todayStr.
 * Negative = overdue, 0 = today, positive = future.
 */
function getDaysDifference(targetDateStr, referenceDateStr) {
  const d1 = new Date(targetDateStr.substring(0, 10));
  const d2 = new Date(referenceDateStr.substring(0, 10));
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Rank tasks and compute human-readable justification reasons.
 * 
 * @param {Array} tasks - Array of task records
 * @param {string} todayDateStr - Reference date string (YYYY-MM-DD), defaults to current date
 * @returns {Array} Ranked tasks with priority_rank, reason, and days_until_due
 */
function rankTasks(tasks = [], todayDateStr = null) {
  const todayStr = todayDateStr || new Date().toISOString().substring(0, 10);

  // Exclude completed tasks from focus recommendations
  const activeTasks = tasks.filter(t => (t.status || '').toLowerCase() !== 'completed');

  const scoredTasks = activeTasks.map(task => {
    const dueStr = typeof task.due_date === 'string'
      ? task.due_date.substring(0, 10)
      : new Date(task.due_date).toISOString().substring(0, 10);
    
    const daysDiff = getDaysDifference(dueStr, todayStr);
    const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1;
    const isInProgress = (task.status || '').toLowerCase() === 'in progress';
    const estimatedHours = Number(task.estimated_hours) || 0;

    let tier = 6;
    let reason = 'Upcoming scheduled task';

    if (daysDiff < 0) {
      tier = 1;
      const overdueDays = Math.abs(daysDiff);
      reason = overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`;
    } else if (daysDiff === 0) {
      tier = 2;
      reason = 'Due today';
    } else if (daysDiff === 1 && task.priority === 'High') {
      tier = 3;
      reason = 'High priority, due tomorrow';
    } else if (daysDiff <= 3) {
      tier = 3;
      reason = `Due in ${daysDiff} days`;
    } else if (task.priority === 'High') {
      tier = 4;
      reason = 'High priority academic task';
    } else if (isInProgress) {
      tier = 5;
      reason = 'Currently in progress';
    } else {
      tier = 6;
      reason = `Due on ${dueStr}`;
    }

    return {
      ...task,
      due_date_str: dueStr,
      days_until_due: daysDiff,
      ranking_tier: tier,
      priority_weight: priorityWeight,
      ranking_reason: reason
    };
  });

  // Sort by tier ascending, then tie-breakers:
  // 1. Earlier due date (daysDiff ascending)
  // 2. Higher priority weight (descending)
  // 3. Larger estimated hours (descending)
  // 4. Alphabetical title
  scoredTasks.sort((a, b) => {
    if (a.ranking_tier !== b.ranking_tier) {
      return a.ranking_tier - b.ranking_tier;
    }
    if (a.days_until_due !== b.days_until_due) {
      return a.days_until_due - b.days_until_due;
    }
    if (b.priority_weight !== a.priority_weight) {
      return b.priority_weight - a.priority_weight;
    }
    if (b.estimated_hours !== a.estimated_hours) {
      return Number(b.estimated_hours) - Number(a.estimated_hours);
    }
    return (a.title || '').localeCompare(b.title || '');
  });

  // Assign sequential 1-based ranks
  return scoredTasks.map((task, index) => ({
    ...task,
    focus_rank: index + 1
  }));
}

module.exports = {
  rankTasks,
  getDaysDifference
};

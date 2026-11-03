/**
 * DeadlineDeck - Academic Workload Pressure Calculation Service
 * 
 * Strict Specification Rules:
 * 1. Total Workload = Sum of estimated_hours for tasks on `planned_date` where status != 'Completed'
 * 2. Available Hours = Date-specific capacity if set, else user's default_study_hours
 * 3. Gap = Total Workload - Available Hours
 * 4. Utilization = (Total Workload / Available Hours) * 100
 * 5. Thresholds:
 *    - Balanced: utilization <= 80%
 *    - Near capacity: utilization > 80% and <= 100%
 *    - Overloaded: utilization > 100%
 * 6. Zero Capacity: Return status 'Capacity not set' without division by zero.
 */

const WORKLOAD_STATUS = {
  BALANCED: 'Balanced',
  NEAR_CAPACITY: 'Near capacity',
  OVERLOADED: 'Overloaded',
  NOT_CONFIGURED: 'Capacity not set'
};

/**
 * Format a decimal hour difference into a natural human-readable string.
 * Example: 0.5 -> "30 minutes", 1.5 -> "1 hour 30 minutes", 2.0 -> "2 hours"
 */
function formatHourDifference(hours) {
  const absHours = Math.abs(Number(hours) || 0);
  const totalMinutes = Math.round(absHours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hrs === 0) {
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }
  if (mins === 0) {
    return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  }
  return `${hrs} hour${hrs === 1 ? '' : 's'} ${mins} minute${mins === 1 ? '' : 's'}`;
}

/**
 * Pure calculation function for workload pressure.
 * 
 * @param {Array} tasks - Array of task objects with estimated_hours, status, planned_date
 * @param {number|null} availableHours - Available capacity for that date
 * @param {string} dateStr - YYYY-MM-DD date string being evaluated
 * @returns {Object} Workload metrics
 */
function calculateDayWorkload(tasks = [], availableHours = null, dateStr = '') {
  // Filter tasks: must match planned_date (if dateStr provided) and NOT be Completed
  const activeTasks = tasks.filter(t => {
    const isCompleted = (t.status || '').toLowerCase() === 'completed';
    if (isCompleted) return false;
    if (dateStr && t.planned_date) {
      const taskDate = typeof t.planned_date === 'string' 
        ? t.planned_date.substring(0, 10) 
        : new Date(t.planned_date).toISOString().substring(0, 10);
      return taskDate === dateStr;
    }
    return true;
  });

  const totalHours = activeTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0);
  const roundedTotalHours = Math.round(totalHours * 100) / 100;

  const capacity = availableHours !== null && availableHours !== undefined ? Number(availableHours) : null;

  if (capacity === null || capacity <= 0) {
    return {
      date: dateStr,
      planned_hours: roundedTotalHours,
      available_hours: 0,
      utilization_percentage: null,
      gap_hours: null,
      status: WORKLOAD_STATUS.NOT_CONFIGURED,
      status_code: 'not_configured',
      task_count: activeTasks.length,
      tasks: activeTasks,
      summary_message: roundedTotalHours > 0
        ? `You have ${roundedTotalHours}h of study planned, but daily study capacity is not configured.`
        : 'Daily study capacity is not configured for this date.'
    };
  }

  const gap = Math.round((roundedTotalHours - capacity) * 100) / 100;
  const utilization = Math.round((roundedTotalHours / capacity) * 1000) / 10; // 1 decimal place, e.g. 116.7

  let status = WORKLOAD_STATUS.BALANCED;
  let statusCode = 'balanced';
  let summaryMessage = '';

  if (utilization > 100) {
    status = WORKLOAD_STATUS.OVERLOADED;
    statusCode = 'overloaded';
    const diffText = formatHourDifference(gap);
    summaryMessage = `Your planned workload exceeds your available study time by ${diffText}.`;
  } else if (utilization > 80) {
    status = WORKLOAD_STATUS.NEAR_CAPACITY;
    statusCode = 'near_capacity';
    const remainingText = formatHourDifference(Math.abs(gap));
    summaryMessage = `You are approaching study capacity. You have ${remainingText} of buffer remaining.`;
  } else {
    status = WORKLOAD_STATUS.BALANCED;
    statusCode = 'balanced';
    const remainingText = formatHourDifference(Math.abs(gap));
    summaryMessage = roundedTotalHours === 0
      ? `No tasks planned for this day. You have ${capacity}h available.`
      : `Planned workload is balanced. You have ${remainingText} free.`;
  }

  return {
    date: dateStr,
    planned_hours: roundedTotalHours,
    available_hours: capacity,
    utilization_percentage: utilization,
    gap_hours: gap,
    status,
    status_code: statusCode,
    task_count: activeTasks.length,
    tasks: activeTasks,
    summary_message: summaryMessage
  };
}

module.exports = {
  WORKLOAD_STATUS,
  formatHourDifference,
  calculateDayWorkload
};

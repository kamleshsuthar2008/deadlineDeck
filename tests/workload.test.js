const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDayWorkload, formatHourDifference, WORKLOAD_STATUS } = require('../services/workloadService.js');

test('formatHourDifference formats minutes and hours cleanly', () => {
  assert.equal(formatHourDifference(0.5), '30 minutes');
  assert.equal(formatHourDifference(1.0), '1 hour');
  assert.equal(formatHourDifference(1.5), '1 hour 30 minutes');
  assert.equal(formatHourDifference(2.25), '2 hours 15 minutes');
  assert.equal(formatHourDifference(0.75), '45 minutes');
});

test('Exact specification worked example: 3h capacity, 3.5h tasks -> 116.7% Overloaded', () => {
  // Available study hours: 3 hours.
  // Scheduled pending tasks:
  // - DBMS assignment: 1.5 hours.
  // - Web Development practical: 1 hour.
  // - OS revision: 1 hour.
  const tasks = [
    { title: 'DBMS assignment', estimated_hours: 1.5, status: 'Pending', planned_date: '2026-11-04' },
    { title: 'Web Development practical', estimated_hours: 1.0, status: 'Pending', planned_date: '2026-11-04' },
    { title: 'OS revision', estimated_hours: 1.0, status: 'In Progress', planned_date: '2026-11-04' }
  ];

  const result = calculateDayWorkload(tasks, 3.0, '2026-11-04');

  assert.equal(result.planned_hours, 3.5);
  assert.equal(result.available_hours, 3.0);
  assert.equal(result.gap_hours, 0.5);
  assert.equal(result.utilization_percentage, 116.7);
  assert.equal(result.status, WORKLOAD_STATUS.OVERLOADED);
  assert.equal(result.status_code, 'overloaded');
  assert.equal(result.task_count, 3);
  assert.equal(result.summary_message, 'Your planned workload exceeds your available study time by 30 minutes.');
});

test('Workload threshold: Balanced (utilization <= 80%)', () => {
  // 2.4 hours planned out of 3.0 hours available = 80.0% -> Balanced
  const tasks = [
    { title: 'Task A', estimated_hours: 2.4, status: 'Pending', planned_date: '2026-11-04' }
  ];
  const result = calculateDayWorkload(tasks, 3.0, '2026-11-04');

  assert.equal(result.utilization_percentage, 80.0);
  assert.equal(result.status, WORKLOAD_STATUS.BALANCED);
  assert.equal(result.status_code, 'balanced');
});

test('Workload threshold: Near capacity (utilization > 80% and <= 100%)', () => {
  // 2.7 hours planned out of 3.0 hours available = 90.0% -> Near capacity
  const tasks = [
    { title: 'Task A', estimated_hours: 2.7, status: 'Pending', planned_date: '2026-11-04' }
  ];
  const result = calculateDayWorkload(tasks, 3.0, '2026-11-04');

  assert.equal(result.utilization_percentage, 90.0);
  assert.equal(result.status, WORKLOAD_STATUS.NEAR_CAPACITY);
  assert.equal(result.status_code, 'near_capacity');
});

test('Completed tasks are strictly excluded from pending workload', () => {
  const tasks = [
    { title: 'Task 1', estimated_hours: 1.5, status: 'Completed', planned_date: '2026-11-04' },
    { title: 'Task 2', estimated_hours: 1.0, status: 'Pending', planned_date: '2026-11-04' }
  ];
  const result = calculateDayWorkload(tasks, 3.0, '2026-11-04');

  assert.equal(result.planned_hours, 1.0);
  assert.equal(result.task_count, 1);
  assert.equal(result.status, WORKLOAD_STATUS.BALANCED);
});

test('Zero study capacity is handled gracefully without NaN or Infinity', () => {
  const tasks = [
    { title: 'Task 1', estimated_hours: 2.0, status: 'Pending', planned_date: '2026-11-04' }
  ];
  const result = calculateDayWorkload(tasks, 0, '2026-11-04');

  assert.equal(result.utilization_percentage, null);
  assert.equal(result.gap_hours, null);
  assert.equal(result.status, WORKLOAD_STATUS.NOT_CONFIGURED);
  assert.equal(result.status_code, 'not_configured');
  assert.equal(Number.isNaN(result.utilization_percentage), false);
});

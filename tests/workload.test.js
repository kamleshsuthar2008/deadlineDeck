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

test('Section 11 Worked Example: 3h capacity, 3.5h tasks -> 116.7% Overloaded by 30 minutes', () => {
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

// SECTION 24 — WORKLOAD ENGINE TEST CASES

test('Section 24 - Test 1: Available = 5 hours, Pending workload = 3 hours -> Balanced (60%)', () => {
  const tasks = [
    { title: 'Task 1', estimated_hours: 3.0, status: 'Pending', planned_date: '2026-11-10' }
  ];
  const res = calculateDayWorkload(tasks, 5.0, '2026-11-10');

  assert.equal(res.available_hours, 5.0);
  assert.equal(res.planned_hours, 3.0);
  assert.equal(res.utilization_percentage, 60.0);
  assert.equal(res.status, WORKLOAD_STATUS.BALANCED);
  assert.equal(res.status_code, 'balanced');
});

test('Section 24 - Test 2: Available = 5 hours, Pending workload = 4.5 hours -> Near Capacity (90%)', () => {
  const tasks = [
    { title: 'Task 1', estimated_hours: 4.5, status: 'Pending', planned_date: '2026-11-10' }
  ];
  const res = calculateDayWorkload(tasks, 5.0, '2026-11-10');

  assert.equal(res.available_hours, 5.0);
  assert.equal(res.planned_hours, 4.5);
  assert.equal(res.utilization_percentage, 90.0);
  assert.equal(res.status, WORKLOAD_STATUS.NEAR_CAPACITY);
  assert.equal(res.status_code, 'near_capacity');
});

test('Section 24 - Test 3: Available = 5 hours, Pending workload = 6 hours -> Overloaded (120%), Gap = 1 hour', () => {
  const tasks = [
    { title: 'Task 1', estimated_hours: 6.0, status: 'Pending', planned_date: '2026-11-10' }
  ];
  const res = calculateDayWorkload(tasks, 5.0, '2026-11-10');

  assert.equal(res.available_hours, 5.0);
  assert.equal(res.planned_hours, 6.0);
  assert.equal(res.gap_hours, 1.0);
  assert.equal(res.utilization_percentage, 120.0);
  assert.equal(res.status, WORKLOAD_STATUS.OVERLOADED);
  assert.equal(res.status_code, 'overloaded');
  assert.equal(formatHourDifference(res.gap_hours), '1 hour');
});

test('Section 24 - Test 4: Available = 5 hours, Pending before exclusion = 8 hours, Completed task = 2 hours -> Actual pending = 6 hours', () => {
  const tasks = [
    { title: 'Pending Task A', estimated_hours: 4.0, status: 'Pending', planned_date: '2026-11-10' },
    { title: 'Pending Task B', estimated_hours: 2.0, status: 'In Progress', planned_date: '2026-11-10' },
    { title: 'Done Task C', estimated_hours: 2.0, status: 'Completed', planned_date: '2026-11-10' }
  ];
  const res = calculateDayWorkload(tasks, 5.0, '2026-11-10');

  assert.equal(res.planned_hours, 6.0);
  assert.equal(res.task_count, 2);
  assert.equal(res.gap_hours, 1.0);
  assert.equal(res.status, WORKLOAD_STATUS.OVERLOADED);
});

test('Section 24 - Test 5: Available = 0 hours, Pending workload = 2 hours -> Zero-capacity handled safely without division by zero', () => {
  const tasks = [
    { title: 'Task 1', estimated_hours: 2.0, status: 'Pending', planned_date: '2026-11-10' }
  ];
  const res = calculateDayWorkload(tasks, 0, '2026-11-10');

  assert.equal(res.available_hours, 0);
  assert.equal(res.planned_hours, 2.0);
  assert.equal(res.utilization_percentage, null);
  assert.equal(res.gap_hours, null);
  assert.equal(res.status, WORKLOAD_STATUS.NOT_CONFIGURED);
  assert.equal(res.status_code, 'not_configured');
  assert.equal(Number.isNaN(res.utilization_percentage), false);
  assert.equal(Number.isFinite(res.utilization_percentage), false);
});

test('Section 24 - Test 6: Due date differs from planned date -> Workload calculated against planned date, due date remains distinct', () => {
  const tasks = [
    {
      title: 'Operating Systems Lab Prep',
      estimated_hours: 3.5,
      status: 'Pending',
      planned_date: '2026-11-10',
      due_date: '2026-11-18'
    }
  ];

  // Evaluated for 2026-11-10 (planned study date)
  const plannedDayRes = calculateDayWorkload(tasks, 4.0, '2026-11-10');
  assert.equal(plannedDayRes.planned_hours, 3.5);
  assert.equal(plannedDayRes.task_count, 1);
  assert.equal(plannedDayRes.status, WORKLOAD_STATUS.NEAR_CAPACITY);
  assert.equal(plannedDayRes.tasks[0].due_date, '2026-11-18');

  // Evaluated for 2026-11-18 (submission due date, not planned date)
  const dueDayRes = calculateDayWorkload(tasks, 4.0, '2026-11-18');
  assert.equal(dueDayRes.planned_hours, 0.0);
  assert.equal(dueDayRes.task_count, 0);
  assert.equal(dueDayRes.status, WORKLOAD_STATUS.BALANCED);
});

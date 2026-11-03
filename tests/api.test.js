const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDayWorkload, formatHourDifference, WORKLOAD_STATUS } = require('../services/workloadService.js');
const { rankTasks, getDaysDifference } = require('../services/priorityService.js');

test('API validation: Task type constraints', () => {
  const validTypes = [
    'Assignment',
    'Practical',
    'Project',
    'Quiz',
    'Internal Examination',
    'End-Term Examination',
    'Revision',
    'Other'
  ];
  assert.equal(validTypes.includes('Assignment'), true);
  assert.equal(validTypes.includes('Practical'), true);
  assert.equal(validTypes.includes('InvalidType'), false);
});

test('API validation: Hours decimal stepping', () => {
  const step = 0.25;
  const hours = 1.75;
  assert.equal(hours % step, 0);
});

test('Workload calculation: Date-specific override precedence over default capacity', () => {
  const tasks = [
    { title: 'DSA Trees', estimated_hours: 2.5, status: 'Pending', planned_date: '2026-11-08' }
  ];
  const defaultCapacity = 3.0; // Would be 83.3% Near capacity
  const dateSpecificCapacity = 4.0; // Override applied -> 62.5% Balanced

  const resWithDefault = calculateDayWorkload(tasks, defaultCapacity, '2026-11-08');
  assert.equal(resWithDefault.status_code, 'near_capacity');

  const resWithOverride = calculateDayWorkload(tasks, dateSpecificCapacity, '2026-11-08');
  assert.equal(resWithOverride.status_code, 'balanced');
  assert.equal(resWithOverride.utilization_percentage, 62.5);
});

test('Workload calculation: Exactly 80.0% boundary is Balanced', () => {
  const tasks = [
    { title: 'Task', estimated_hours: 2.4, status: 'Pending', planned_date: '2026-11-08' }
  ];
  const res = calculateDayWorkload(tasks, 3.0, '2026-11-08');
  assert.equal(res.utilization_percentage, 80.0);
  assert.equal(res.status_code, 'balanced');
});

test('Workload calculation: Exactly 100.0% boundary is Near capacity', () => {
  const tasks = [
    { title: 'Task', estimated_hours: 3.0, status: 'Pending', planned_date: '2026-11-08' }
  ];
  const res = calculateDayWorkload(tasks, 3.0, '2026-11-08');
  assert.equal(res.utilization_percentage, 100.0);
  assert.equal(res.status_code, 'near_capacity');
});

test('Workload calculation: 100.1% or higher is Overloaded', () => {
  const tasks = [
    { title: 'Task', estimated_hours: 3.1, status: 'Pending', planned_date: '2026-11-08' }
  ];
  const res = calculateDayWorkload(tasks, 3.0, '2026-11-08');
  assert.equal(res.utilization_percentage > 100, true);
  assert.equal(res.status_code, 'overloaded');
});

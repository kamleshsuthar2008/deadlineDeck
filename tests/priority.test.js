const test = require('node:test');
const assert = require('node:assert/strict');
const { rankTasks, getDaysDifference } = require('../services/priorityService.js');

test('getDaysDifference computes correct positive, negative, and zero day offsets', () => {
  assert.equal(getDaysDifference('2026-11-04', '2026-11-04'), 0);
  assert.equal(getDaysDifference('2026-11-03', '2026-11-04'), -1);
  assert.equal(getDaysDifference('2026-11-06', '2026-11-04'), 2);
});

test('Overdue tasks rank first before tasks due today or upcoming', () => {
  const referenceDate = '2026-11-04';
  const tasks = [
    { id: 1, title: 'Upcoming Project', due_date: '2026-11-08', priority: 'High', status: 'Pending', estimated_hours: 2 },
    { id: 2, title: 'Overdue Assignment', due_date: '2026-11-02', priority: 'Medium', status: 'Pending', estimated_hours: 1 },
    { id: 3, title: 'Due Today Quiz', due_date: '2026-11-04', priority: 'High', status: 'Pending', estimated_hours: 1 }
  ];

  const ranked = rankTasks(tasks, referenceDate);

  assert.equal(ranked[0].id, 2);
  assert.equal(ranked[0].focus_rank, 1);
  assert.equal(ranked[0].ranking_reason, 'Overdue by 2 days');

  assert.equal(ranked[1].id, 3);
  assert.equal(ranked[1].focus_rank, 2);
  assert.equal(ranked[1].ranking_reason, 'Due today');

  assert.equal(ranked[2].id, 1);
  assert.equal(ranked[2].focus_rank, 3);
});

test('Completed tasks are excluded from focus ranking', () => {
  const referenceDate = '2026-11-04';
  const tasks = [
    { id: 1, title: 'Completed Past Work', due_date: '2026-11-01', priority: 'High', status: 'Completed', estimated_hours: 3 },
    { id: 2, title: 'Active Today Work', due_date: '2026-11-04', priority: 'Low', status: 'Pending', estimated_hours: 1 }
  ];

  const ranked = rankTasks(tasks, referenceDate);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, 2);
});

test('Tie breaker favors higher priority when due dates are identical', () => {
  const referenceDate = '2026-11-04';
  const tasks = [
    { id: 1, title: 'Medium Priority Task', due_date: '2026-11-06', priority: 'Medium', status: 'Pending', estimated_hours: 1 },
    { id: 2, title: 'High Priority Task', due_date: '2026-11-06', priority: 'High', status: 'Pending', estimated_hours: 1 }
  ];

  const ranked = rankTasks(tasks, referenceDate);
  assert.equal(ranked[0].id, 2);
  assert.equal(ranked[1].id, 1);
});

/**
 * DeadlineDeck - Dashboard Interactive Controller
 * Strict adherence to Part A5, A6 specifications
 */

let currentWeekOffset = 0;
let cachedWorkloadData = null;
let selectedDateStr = null;
let userSubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  setupGreeting(user.name);
  setupDateDisplay();
  setupWeekNavigation();
  setupQuickAddModal();

  await loadSubjects();
  await loadDashboardSummary();
  await loadWorkloadMap(currentWeekOffset);
});

/**
 * 1. Time-of-day greeting (computed in JS without emoji or exclamation marks)
 */
function setupGreeting(studentName) {
  const hour = new Date().getHours();
  let timeOfDay = 'day';
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else timeOfDay = 'evening';

  const firstName = (studentName || 'Student').trim().split(' ')[0];
  const el = document.getElementById('greeting-heading');
  if (el) el.textContent = `Good ${timeOfDay}, ${firstName}.`;
}

/**
 * 2. Current academic date display
 */
function setupDateDisplay() {
  const el = document.getElementById('current-date-display');
  if (!el) return;
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = new Date().toLocaleDateString('en-US', options);
}

/**
 * 3. Week Navigation Toolbar
 */
function setupWeekNavigation() {
  const prevBtn = document.getElementById('btn-prev-week');
  const nextBtn = document.getElementById('btn-next-week');
  const label = document.getElementById('week-display-label');

  prevBtn.addEventListener('click', () => {
    currentWeekOffset--;
    updateWeekLabel(label);
    loadWorkloadMap(currentWeekOffset);
  });

  nextBtn.addEventListener('click', () => {
    currentWeekOffset++;
    updateWeekLabel(label);
    loadWorkloadMap(currentWeekOffset);
  });
}

function updateWeekLabel(labelEl) {
  if (currentWeekOffset === 0) {
    labelEl.textContent = 'This week';
  } else if (currentWeekOffset === -1) {
    labelEl.textContent = 'Previous week';
  } else if (currentWeekOffset === 1) {
    labelEl.textContent = 'Next week';
  } else if (currentWeekOffset < 0) {
    labelEl.textContent = `${Math.abs(currentWeekOffset)} weeks ago`;
  } else {
    labelEl.textContent = `+${currentWeekOffset} weeks`;
  }
}

/**
 * 4. Load Academic Summary & Ribbon Metrics
 */
async function loadDashboardSummary() {
  try {
    const data = await API.get('/api/dashboard/summary');

    // Ribbon figures
    document.getElementById('stat-pending').textContent = data.ribbon.pending_tasks;
    document.getElementById('stat-due-today').textContent = data.ribbon.due_today;
    document.getElementById('stat-completed').textContent = data.ribbon.completed_tasks;

    const overdueEl = document.getElementById('stat-overdue');
    overdueEl.textContent = data.ribbon.overdue_tasks;
    const overdueCell = document.getElementById('cell-overdue');
    if (data.ribbon.overdue_tasks > 0) {
      overdueCell.classList.add('is-overdue-alert');
    } else {
      overdueCell.classList.remove('is-overdue-alert');
    }

    document.getElementById('stat-rate').innerHTML = `${data.ribbon.completion_rate}<span class="overview-unit">%</span>`;

    // Today's Focus List
    renderFocusList(data.today_focus);

    // Upcoming Deadlines Timeline
    renderDeadlinesTimeline(data.upcoming_deadlines);

    // Subject Workload Bars
    renderSubjectWorkload(data.subject_workload);

    // Insights Rail Widgets
    renderInsightsRail(data);
  } catch (err) {
    console.error('Failed to load dashboard summary:', err);
  }
}

/**
 * 5. Load and Render Signature Weekly Workload Map (Part A5)
 */
async function loadWorkloadMap(offset = 0) {
  const container = document.getElementById('workload-map-grid');
  if (!container) return;

  try {
    const data = await API.get(`/api/dashboard/workload?week_offset=${offset}`);
    cachedWorkloadData = data;

    container.innerHTML = '';

    // Default select today if in current week, else select Monday
    const todayStr = new Date().toISOString().substring(0, 10);
    const hasToday = data.days.some(d => d.dateStr === todayStr);
    if (!selectedDateStr || offset !== 0 || !data.days.some(d => d.dateStr === selectedDateStr)) {
      selectedDateStr = hasToday ? todayStr : data.days[0].dateStr;
    }

    data.days.forEach(day => {
      const col = document.createElement('div');
      col.className = `workload-day-column ${day.is_today ? 'is-today' : ''} ${day.dateStr === selectedDateStr ? 'is-selected' : ''}`;
      col.setAttribute('data-date', day.dateStr);
      col.setAttribute('tabindex', '0');
      col.setAttribute('role', 'button');
      col.setAttribute('aria-label', `${day.weekday} ${day.dayNum}: ${day.status}, ${day.planned_hours} of ${day.available_hours} hours planned.`);

      // Vertical Capacity Gauge Calculations
      let gaugeHtml = '';
      if (day.available_hours <= 0) {
        gaugeHtml = `<div class="workload-gauge-track is-empty-capacity" title="Capacity not configured"></div>`;
      } else {
        const planned = day.planned_hours;
        const capacity = day.available_hours;
        const maxScale = Math.max(planned, capacity, 4.0); // Baseline scale
        const capacityBottomPct = Math.round((capacity / maxScale) * 100);

        if (planned > capacity) {
          // OVERLOADED: Base capacity filled in coral, overflow filled with coral diagonal hatch!
          const overflowHours = planned - capacity;
          const baseHeightPct = Math.round((capacity / maxScale) * 100);
          const overflowHeightPct = Math.round((overflowHours / maxScale) * 100);

          gaugeHtml = `
            <div class="workload-gauge-track" title="Planned: ${planned}h / Capacity: ${capacity}h">
              <div class="workload-gauge-tick" style="bottom: ${capacityBottomPct}%;"></div>
              <div class="workload-gauge-overflow" style="height: ${overflowHeightPct}%;"></div>
              <div class="workload-gauge-fill is-overloaded" style="height: ${baseHeightPct}%;"></div>
            </div>
          `;
        } else {
          // BALANCED OR NEAR CAPACITY
          const fillHeightPct = Math.round((planned / maxScale) * 100);
          const fillClass = day.status_code === 'near_capacity' ? 'is-near-capacity' : '';

          gaugeHtml = `
            <div class="workload-gauge-track" title="Planned: ${planned}h / Capacity: ${capacity}h">
              <div class="workload-gauge-tick" style="bottom: ${capacityBottomPct}%;"></div>
              <div class="workload-gauge-fill ${fillClass}" style="height: ${fillHeightPct}%;"></div>
            </div>
          `;
        }
      }

      col.innerHTML = `
        <div class="day-column-header">
          <span class="day-weekday-label">${day.weekday}</span>
          <span class="day-numeral tabular">${day.dayNum}</span>
        </div>
        ${gaugeHtml}
        <div class="day-metrics">
          <span class="day-hours-ratio tabular">${day.planned_hours} / ${day.available_hours}h</span>
          <span class="day-percentage tabular">${day.utilization_percentage !== null ? day.utilization_percentage + '%' : '—'}</span>
          <span class="day-task-count">${day.task_count} task${day.task_count === 1 ? '' : 's'}</span>
          <span class="day-status-text status-${day.status_code}">
            ${day.available_hours <= 0 ? 'Not set' : day.status}
          </span>
        </div>
      `;

      col.addEventListener('click', () => selectDay(day.dateStr));
      col.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectDay(day.dateStr);
        }
      });

      container.appendChild(col);
    });

    renderSelectedDayDetail(selectedDateStr);
  } catch (err) {
    console.error('Failed to load weekly workload map:', err);
  }
}

function selectDay(dateStr) {
  selectedDateStr = dateStr;
  document.querySelectorAll('.workload-day-column').forEach(col => {
    col.classList.toggle('is-selected', col.getAttribute('data-date') === dateStr);
  });
  renderSelectedDayDetail(dateStr);
}

function renderSelectedDayDetail(dateStr) {
  if (!cachedWorkloadData) return;
  const day = cachedWorkloadData.days.find(d => d.dateStr === dateStr);
  if (!day) return;

  const sentenceEl = document.getElementById('workload-detail-sentence');
  sentenceEl.textContent = day.summary_message;

  const listContainer = document.getElementById('day-task-mini-container');
  listContainer.innerHTML = '';

  if (!day.tasks || day.tasks.length === 0) {
    listContainer.innerHTML = `
      <div style="font-size: 13px; color: var(--text-secondary); padding: var(--space-8) 0;">
        No study tasks planned for ${day.weekday}, ${day.monthShort} ${day.dayNum}.
      </div>
    `;
    return;
  }

  day.tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'day-task-mini-item';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--space-8); min-width: 0;">
        <span class="focus-subject-tag">${escapeHTML(task.subject_code)}</span>
        <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHTML(task.title)}
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: var(--space-12); flex-shrink: 0;">
        <span class="tabular" style="font-size: 12.5px; font-weight: 600;">${task.estimated_hours}h</span>
        <span style="font-size: 11.5px; color: var(--text-secondary);">Due ${task.due_date ? task.due_date.substring(0, 10) : ''}</span>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

/**
 * 6. Render Today's Focus (Ranked list with rank numerals & human-readable reasons)
 */
function renderFocusList(focusTasks) {
  const container = document.getElementById('focus-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (!focusTasks || focusTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--space-24) var(--space-16);">
        <div class="empty-state-title">No pending tasks for today</div>
        <div class="empty-state-text">Your immediate study schedule is clear. Great job keeping on top of your coursework!</div>
      </div>
    `;
    return;
  }

  focusTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'focus-item';

    const pClass = task.priority === 'High' ? 'p-high' : (task.priority === 'Medium' ? 'p-med' : 'p-low');

    item.innerHTML = `
      <div class="focus-rank-badge tabular">${task.focus_rank}</div>
      <div class="focus-main-content">
        <div class="focus-title-row">
          <span class="focus-subject-tag">${escapeHTML(task.subject_code)}</span>
          <span class="focus-title">${escapeHTML(task.title)}</span>
        </div>
        <div class="focus-reason-text">
          <svg style="width:14px;height:14px;stroke:currentColor;"><use href="/icons.svg#icon-clock"></use></svg>
          <span>${escapeHTML(task.ranking_reason)}</span>
        </div>
      </div>
      <div class="focus-meta-right">
        <div class="priority-indicator">
          <div class="priority-mark ${pClass}"><span></span><span></span><span></span></div>
          <span style="font-size: 11.5px;">${task.priority}</span>
        </div>
        <span class="focus-hours tabular">${task.estimated_hours}h</span>
      </div>
    `;
    container.appendChild(item);
  });
}

/**
 * 7. Render Upcoming Deadlines Timeline
 */
function renderDeadlinesTimeline(deadlines) {
  const container = document.getElementById('deadlines-timeline-container');
  if (!container) return;
  container.innerHTML = '';

  if (!deadlines || deadlines.length === 0) {
    container.innerHTML = `
      <div style="font-size: 13px; color: var(--text-secondary); text-align: center; padding: var(--space-20) 0;">
        No upcoming submission deadlines scheduled.
      </div>
    `;
    return;
  }

  deadlines.forEach(item => {
    const d = new Date(item.due_date);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();

    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML = `
      <div class="timeline-date-block">
        <div class="timeline-month">${month}</div>
        <div class="timeline-day tabular">${day}</div>
      </div>
      <div class="timeline-info">
        <div class="timeline-title">${escapeHTML(item.title)}</div>
        <div class="timeline-sub">${escapeHTML(item.subject_code)} &bull; ${escapeHTML(item.task_type)} &bull; ${item.estimated_hours}h</div>
      </div>
    `;
    container.appendChild(row);
  });
}

/**
 * 8. Render Subject Workload Horizontal Bars
 */
function renderSubjectWorkload(subjects) {
  const container = document.getElementById('subject-workload-container');
  if (!container) return;
  container.innerHTML = '';

  if (!subjects || subjects.length === 0) {
    container.innerHTML = `
      <div style="font-size: 13px; color: var(--text-secondary); text-align: center; padding: var(--space-20) 0;">
        All subject workloads are currently completed.
      </div>
    `;
    return;
  }

  const maxHours = Math.max(...subjects.map(s => s.pending_hours), 1);

  subjects.forEach(sub => {
    const widthPct = Math.round((sub.pending_hours / maxHours) * 100);
    const row = document.createElement('div');
    row.className = 'subject-workload-row';
    row.innerHTML = `
      <div class="subject-workload-labels">
        <span class="subject-workload-name">${escapeHTML(sub.subject_code)} — ${escapeHTML(sub.subject_name)}</span>
        <span class="subject-workload-hours tabular">${sub.pending_hours}h (${sub.pending_count})</span>
      </div>
      <div class="subject-bar-track">
        <div class="subject-bar-fill" style="width: ${widthPct}%;"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

/**
 * 9. Render Insights Rail
 */
function renderInsightsRail(summaryData) {
  const tw = summaryData.today_workload;

  document.getElementById('rail-capacity-hours').textContent = `${tw.available_hours} h`;

  // Pressure Chip
  const chipContainer = document.getElementById('rail-status-chip-container');
  const chipClass = tw.status_code === 'overloaded' ? 'is-overloaded' : (tw.status_code === 'near_capacity' ? 'is-near-capacity' : 'is-balanced');
  chipContainer.innerHTML = `
    <div class="status-chip ${chipClass}">
      <span class="status-dot"></span>
      <span>${tw.status} (${tw.planned_hours} / ${tw.available_hours}h)</span>
    </div>
  `;
  document.getElementById('rail-status-sentence').textContent = tw.summary_message;

  // Completion Ring
  const pct = summaryData.ribbon.completion_rate;
  document.getElementById('rail-completion-percentage').textContent = `${pct}%`;
  const ringFill = document.getElementById('completion-ring-fill');
  if (ringFill) {
    ringFill.setAttribute('stroke-dasharray', `${pct}, 100`);
  }

  // Next Deadline Countdown
  if (summaryData.upcoming_deadlines && summaryData.upcoming_deadlines.length > 0) {
    const nextD = summaryData.upcoming_deadlines[0];
    document.getElementById('rail-next-deadline-title').textContent = nextD.title;
    document.getElementById('rail-next-deadline-sub').textContent = `${nextD.subject_code} • Due ${nextD.due_date}`;
  } else {
    document.getElementById('rail-next-deadline-title').textContent = 'No imminent deadlines';
    document.getElementById('rail-next-deadline-sub').textContent = 'All academic targets met';
  }
}

/**
 * 10. Quick Add Task Modal Management
 */
async function loadSubjects() {
  try {
    const data = await API.get('/api/subjects');
    userSubjects = data.subjects || [];
    const select = document.getElementById('task-subject');
    if (!select) return;
    select.innerHTML = '';
    userSubjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.subject_id;
      opt.textContent = `${s.subject_code} — ${s.subject_name}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
}

function setupQuickAddModal() {
  const btn = document.getElementById('btn-quick-add-task');
  const modalForm = document.getElementById('task-modal-form');

  if (btn) {
    btn.addEventListener('click', () => {
      // Default dates to today
      const todayStr = new Date().toISOString().substring(0, 10);
      document.getElementById('task-planned-date').value = selectedDateStr || todayStr;
      document.getElementById('task-due-date').value = selectedDateStr || todayStr;
      UI.openModal('task-modal');
    });
  }

  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-task');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        await API.post('/api/tasks', {
          title: document.getElementById('task-title').value,
          subject_id: document.getElementById('task-subject').value,
          task_type: document.getElementById('task-type').value,
          planned_date: document.getElementById('task-planned-date').value,
          due_date: document.getElementById('task-due-date').value,
          estimated_hours: document.getElementById('task-hours').value,
          priority: document.getElementById('task-priority').value,
          description: document.getElementById('task-description').value,
          status: 'Pending'
        });

        UI.closeModal('task-modal');
        modalForm.reset();
        UI.showToast('Academic task created successfully.');

        // Refresh dashboard immediately from real saved data
        await loadDashboardSummary();
        await loadWorkloadMap(currentWeekOffset);
      } catch (err) {
        UI.showToast(err.message || 'Failed to create task.', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save task';
      }
    });
  }
}

/**
 * DeadlineDeck - Planner Viewport Controller
 */

let weekOffset = 0;
let cachedWeek = null;
let activeDate = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  setupWeekControls();
  await loadPlannerWeek(0);
});

function setupWeekControls() {
  const prevBtn = document.getElementById('btn-prev-week') || document.getElementById('btn-planner-prev');
  const nextBtn = document.getElementById('btn-next-week') || document.getElementById('btn-planner-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      weekOffset--;
      updatePlannerWeekLabel();
      loadPlannerWeek(weekOffset);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      weekOffset++;
      updatePlannerWeekLabel();
      loadPlannerWeek(weekOffset);
    });
  }
}

function updatePlannerWeekLabel() {
  const label = document.getElementById('week-display-label') || document.getElementById('planner-week-label');
  if (!label) return;
  if (weekOffset === 0) label.textContent = 'This week';
  else if (weekOffset === -1) label.textContent = 'Previous week';
  else if (weekOffset === 1) label.textContent = 'Next week';
  else if (weekOffset < 0) label.textContent = `${Math.abs(weekOffset)} weeks ago`;
  else label.textContent = `+${weekOffset} weeks`;
}

async function loadPlannerWeek(offset = 0) {
  try {
    const data = await API.get(`/api/dashboard/workload?week_offset=${offset}`);
    cachedWeek = data;

    const todayStr = new Date().toISOString().substring(0, 10);
    const hasToday = data.days.some(d => d.dateStr === todayStr);

    if (!activeDate || offset !== 0 || !data.days.some(d => d.dateStr === activeDate)) {
      activeDate = hasToday ? todayStr : data.days[0].dateStr;
    }

    renderDayStrips(data.days);
    await selectPlannerDate(activeDate);
  } catch (err) {
    console.error('Failed to load planner week:', err);
  }
}

function renderDayStrips(days) {
  const container = document.getElementById('planner-days-list');
  container.innerHTML = '';

  days.forEach(day => {
    const item = document.createElement('div');
    item.className = `day-strip-item ${day.dateStr === activeDate ? 'is-selected' : ''}`;
    item.setAttribute('data-date', day.dateStr);

    let statusChipClass = 'is-balanced';
    if (day.status_code === 'overloaded') statusChipClass = 'is-overloaded';
    else if (day.status_code === 'near_capacity') statusChipClass = 'is-near-capacity';
    else if (day.status_code === 'not_configured') statusChipClass = 'is-not-configured';

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--space-12);">
        <div style="width: 32px; text-align: center;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">${day.weekday}</div>
          <div class="tabular" style="font-family: var(--font-display); font-size: 16px; font-weight: 600;">${day.dayNum}</div>
        </div>
        <div>
          <div class="tabular" style="font-size: 13px; font-weight: 600;">${day.planned_hours} / ${day.available_hours}h</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${day.task_count} task${day.task_count === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div class="status-chip ${statusChipClass}">
        <span class="status-dot"></span>
        <span style="font-size: 11.5px;">${day.status}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      activeDate = day.dateStr;
      document.querySelectorAll('.day-strip-item').forEach(el => {
        el.classList.toggle('is-selected', el.getAttribute('data-date') === day.dateStr);
      });
      selectPlannerDate(day.dateStr);
    });

    container.appendChild(item);
  });
}

async function selectPlannerDate(dateStr) {
  try {
    const data = await API.get(`/api/planner/day/${dateStr}`);
    const wl = data.workload;

    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const eyebrowEl = document.getElementById('detail-eyebrow') || document.getElementById('selected-day-eyebrow');
    if (eyebrowEl) eyebrowEl.textContent = `${wl.planned_hours} hours planned • ${wl.available_hours} hours available`;

    const titleEl = document.getElementById('detail-date-heading') || document.getElementById('selected-day-title');
    if (titleEl) titleEl.textContent = dateFormatted;

    const capSubEl = document.getElementById('detail-capacity-sub');
    if (capSubEl) capSubEl.textContent = `Study Capacity: ${wl.available_hours}h`;

    const pillEl = document.getElementById('detail-status-pill');
    if (pillEl) {
      pillEl.className = `status-pill ${wl.status_code}`;
      pillEl.textContent = wl.status;
    }

    const chipContainer = document.getElementById('selected-day-chip-container');
    if (chipContainer) {
      const chipClass = wl.status_code === 'overloaded' ? 'is-overloaded' : (wl.status_code === 'near_capacity' ? 'is-near-capacity' : 'is-balanced');
      chipContainer.innerHTML = `
        <div class="status-chip ${chipClass}">
          <span class="status-dot"></span>
          <span>${wl.status} (${wl.utilization_percentage !== null ? wl.utilization_percentage + '%' : 'Not set'})</span>
        </div>
      `;
    }

    const verdictEl = document.getElementById('workload-summary-text') || document.getElementById('planner-verdict-box');
    if (verdictEl) verdictEl.textContent = wl.summary_message;

    const utilBadge = document.getElementById('workload-utilization-badge');
    if (utilBadge) utilBadge.textContent = wl.utilization_percentage !== null ? `${wl.utilization_percentage}%` : 'N/A';

    const banner = document.getElementById('workload-summary-banner');
    if (banner) {
      banner.className = `workload-alert-banner ${wl.status_code}`;
    }

    // Tasks list
    renderPlannerTasks(data.tasks);
  } catch (err) {
    console.error('Failed to load day details:', err);
  }
}

function renderPlannerTasks(tasks) {
  const container = document.getElementById('planner-tasks-container');
  container.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--space-32) var(--space-16);">
        <div class="empty-state-title">No study sessions planned for this date</div>
        <div class="empty-state-text">You have completely clear study capacity. You can reschedule tasks from other days here.</div>
      </div>
    `;
    return;
  }

  tasks.forEach(task => {
    const row = document.createElement('div');
    row.style.cssText = 'background: var(--card); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); padding: var(--space-12) var(--space-16); display: flex; flex-direction: column; gap: var(--space-8);';

    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-12);">
        <div style="min-width: 0;">
          <div style="display: flex; align-items: center; gap: var(--space-8);">
            <span class="focus-subject-tag">${escapeHTML(task.subject_code)}</span>
            <span style="font-weight: 600; font-size: 14px;">${escapeHTML(task.title)}</span>
          </div>
          <div style="display: flex; gap: var(--space-8); align-items: center; margin-top: 6px; flex-wrap: wrap;">
            <span class="marker-planned">Planned: ${task.planned_date.substring(0, 10)}</span>
            <span class="marker-due">Due: ${task.due_date.substring(0, 10)}</span>
            <span class="secondary tabular" style="font-size: 12px;">Est: ${task.estimated_hours}h</span>
          </div>
        </div>
        <div class="reschedule-control">
          <label style="font-size: 11.5px; color: var(--text-secondary);">Move to:</label>
          <input type="date" class="input-text tabular" style="height: 32px; font-size: 12px; width: 140px;" value="${task.planned_date.substring(0, 10)}">
          <button class="btn btn-secondary btn-reschedule" style="height: 32px; padding: 0 10px; font-size: 12px;">Move</button>
        </div>
      </div>
    `;

    const dateInput = row.querySelector('input[type="date"]');
    const moveBtn = row.querySelector('.btn-reschedule');

    moveBtn.addEventListener('click', async () => {
      const newDate = dateInput.value;
      if (!newDate) return;
      if (newDate === task.planned_date.substring(0, 10)) {
        UI.showToast('Select a different date to reschedule.');
        return;
      }

      if (!confirm(`Move study session for "${task.title}" from ${task.planned_date.substring(0, 10)} to ${newDate}? (Due date will remain ${task.due_date.substring(0, 10)})`)) {
        return;
      }

      try {
        await API.patch(`/api/planner/tasks/${task.task_id}/reschedule`, {
          new_planned_date: newDate
        });
        UI.showToast(`Task rescheduled to ${newDate}. Workload updated.`);
        // Reload planner immediately from real saved data
        await loadPlannerWeek(weekOffset);
      } catch (err) {
        UI.showToast(err.message || 'Failed to reschedule task', 'error');
      }
    });

    container.appendChild(row);
  });
}

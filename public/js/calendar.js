/**
 * DeadlineDeck - Academic Calendar Controller
 */

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth() + 1; // 1-12
let selectedDateStr = new Date().toISOString().substring(0, 10);
let monthEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  setupCalendarControls();
  await loadCalendarMonth(calYear, calMonth);
});

function setupCalendarControls() {
  document.getElementById('btn-cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    loadCalendarMonth(calYear, calMonth);
  });

  document.getElementById('btn-cal-next').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    loadCalendarMonth(calYear, calMonth);
  });

  document.getElementById('btn-cal-today').addEventListener('click', () => {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;
    selectedDateStr = now.toISOString().substring(0, 10);
    loadCalendarMonth(calYear, calMonth);
  });
}

async function loadCalendarMonth(year, month) {
  try {
    const data = await API.get(`/api/calendar?year=${year}&month=${month}`);
    monthEvents = data.events || [];

    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
    document.getElementById('cal-month-title').textContent = `${monthName} ${year}`;

    renderMonthGrid(year, month, monthEvents);
    renderInspector(selectedDateStr);
  } catch (err) {
    console.error('Failed to load calendar month:', err);
  }
}

function renderMonthGrid(year, month, events) {
  const grid = document.getElementById('calendar-grid');
  // Preserve the 7 header divs
  while (grid.children.length > 7) {
    grid.removeChild(grid.lastChild);
  }

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().substring(0, 10);

  // In JS Sunday=0, Monday=1... We want Monday to be 0
  let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month trailing days
  const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell is-outside-month';
    cell.innerHTML = `<span class="cell-date-num">${dayNum}</span>`;
    grid.appendChild(cell);
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = `calendar-day-cell ${dateStr === selectedDateStr ? 'is-selected' : ''}`;
    cell.setAttribute('data-date', dateStr);

    const isToday = dateStr === todayStr;

    // Filter events
    const plannedTasks = events.filter(e => e.planned_date === dateStr);
    const dueTasks = events.filter(e => e.due_date === dateStr);

    let eventRowsHtml = '';
    // Show maximum 3 event tags inside cell
    let tagCount = 0;
    plannedTasks.forEach(t => {
      if (tagCount < 2) {
        eventRowsHtml += `<div class="cal-event-dot type-planned" title="Planned: ${escapeHTML(t.title)}">${escapeHTML(t.subject_code)}: ${escapeHTML(t.title)}</div>`;
        tagCount++;
      }
    });

    dueTasks.forEach(t => {
      if (tagCount < 3) {
        eventRowsHtml += `<div class="cal-event-dot type-due" title="Due: ${escapeHTML(t.title)}">DUE: ${escapeHTML(t.title)}</div>`;
        tagCount++;
      }
    });

    const moreCount = (plannedTasks.length + dueTasks.length) - tagCount;
    if (moreCount > 0) {
      eventRowsHtml += `<span style="font-size: 10px; color: var(--text-secondary); margin-top: 1px;">+${moreCount} more</span>`;
    }

    cell.innerHTML = `
      <div class="cell-top-row">
        <span class="cell-date-num ${isToday ? 'cell-is-today' : ''}">${day}</span>
        ${(plannedTasks.length + dueTasks.length) > 0 ? `<span style="font-size: 10px; color: var(--text-muted);">${plannedTasks.length + dueTasks.length}</span>` : ''}
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
        ${eventRowsHtml}
      </div>
    `;

    cell.addEventListener('click', () => {
      selectedDateStr = dateStr;
      document.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('is-selected'));
      cell.classList.add('is-selected');
      renderInspector(dateStr);
    });

    grid.appendChild(cell);
  }

  // Trailing days to fill 35 or 42 grid cells
  const currentTotalCells = startDayOfWeek + totalDaysInMonth;
  const targetTotal = currentTotalCells <= 35 ? 35 : 42;
  const remaining = targetTotal - currentTotalCells;
  for (let d = 1; d <= remaining; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell is-outside-month';
    cell.innerHTML = `<span class="cell-date-num">${d}</span>`;
    grid.appendChild(cell);
  }
}

function renderInspector(dateStr) {
  const d = new Date(dateStr);
  const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  document.getElementById('cal-day-heading').textContent = formatted;

  const plannedTasks = monthEvents.filter(e => e.planned_date === dateStr);
  const dueTasks = monthEvents.filter(e => e.due_date === dateStr);

  const studyContainer = document.getElementById('inspector-study-list');
  const dueContainer = document.getElementById('inspector-due-list');

  studyContainer.innerHTML = '';
  dueContainer.innerHTML = '';

  if (plannedTasks.length === 0) {
    studyContainer.innerHTML = '<div style="font-size: 12.5px; color: var(--text-secondary);">No study sessions scheduled for this date.</div>';
  } else {
    plannedTasks.forEach(t => {
      const el = document.createElement('div');
      el.style.cssText = 'background: var(--surface); padding: 8px 10px; border-radius: var(--radius-sm); font-size: 13px; display: flex; justify-content: space-between; align-items: center;';
      el.innerHTML = `
        <div>
          <span class="focus-subject-tag">${escapeHTML(t.subject_code)}</span>
          <span style="font-weight: 500; margin-left: 4px;">${escapeHTML(t.title)}</span>
        </div>
        <span class="tabular" style="font-size: 12px; font-weight: 600;">${t.estimated_hours}h</span>
      `;
      studyContainer.appendChild(el);
    });
  }

  if (dueTasks.length === 0) {
    dueContainer.innerHTML = '<div style="font-size: 12.5px; color: var(--text-secondary);">No submissions due on this date.</div>';
  } else {
    dueTasks.forEach(t => {
      const el = document.createElement('div');
      el.style.cssText = 'background: var(--card); border: 1px solid var(--border-strong); padding: 8px 10px; border-radius: var(--radius-sm); font-size: 13px; display: flex; justify-content: space-between; align-items: center;';
      el.innerHTML = `
        <div>
          <span class="focus-subject-tag">${escapeHTML(t.subject_code)}</span>
          <span style="font-weight: 600; margin-left: 4px;">${escapeHTML(t.title)}</span>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${escapeHTML(t.task_type)} &bull; ${t.priority} priority</div>
        </div>
        <span class="status-chip is-overloaded" style="font-size: 11px;"><span class="status-dot"></span>Due</span>
      `;
      dueContainer.appendChild(el);
    });
  }
}

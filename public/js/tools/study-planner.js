/**
 * DeadlineDeck - Study Session Planner & Focus Timer Controller
 */

let timerSeconds = 25 * 60;
let initialBlockSeconds = 25 * 60;
let timerInterval = null;
let isRunning = false;

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init(true);

  setupTimerControls();
  setupScheduleGenerator();
  await loadTasksDropdown();
  await loadSessionHistory();
});

function formatTimer(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  document.getElementById('timer-display').textContent = formatTimer(timerSeconds);
}

function setupTimerControls() {
  const toggleBtn = document.getElementById('btn-timer-toggle');
  const labelSpan = document.getElementById('btn-timer-label');
  const resetBtn = document.getElementById('btn-timer-reset');
  const completeBtn = document.getElementById('btn-timer-complete');
  const stateLabel = document.getElementById('timer-state-label');

  toggleBtn.addEventListener('click', () => {
    if (isRunning) {
      clearInterval(timerInterval);
      isRunning = false;
      labelSpan.textContent = 'Resume focus block';
      stateLabel.textContent = 'Session paused';
    } else {
      isRunning = true;
      labelSpan.textContent = 'Pause focus block';
      stateLabel.textContent = 'Focus in progress';
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          updateTimerDisplay();
        } else {
          clearInterval(timerInterval);
          isRunning = false;
          stateLabel.textContent = 'Focus block completed';
          labelSpan.textContent = 'Start focus block';
          UI.showToast('Study session block finished! Great focus.');
          logCompletedSession();
        }
      }, 1000);
    }
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    isRunning = false;
    timerSeconds = initialBlockSeconds;
    updateTimerDisplay();
    labelSpan.textContent = 'Start focus block';
    stateLabel.textContent = 'Ready to study';
  });

  completeBtn.addEventListener('click', () => {
    logCompletedSession();
  });
}

async function logCompletedSession() {
  const taskSelect = document.getElementById('session-task-select');
  const taskId = taskSelect.value ? Number(taskSelect.value) : null;
  const elapsedSecs = initialBlockSeconds - timerSeconds;
  const elapsedMins = Math.max(Math.round(elapsedSecs / 60), 1);

  try {
    await API.post('/api/study-sessions', {
      task_id: taskId,
      duration_minutes: elapsedMins
    });
    UI.showToast(`Logged ${elapsedMins} minute study session.`);
    await loadSessionHistory();
  } catch (err) {
    UI.showToast(err.message || 'Failed to log study session', 'error');
  }
}

async function loadTasksDropdown() {
  try {
    const data = await API.get('/api/tasks?status=Pending');
    const select = document.getElementById('session-task-select');
    select.innerHTML = '<option value="">None (Independent focus)</option>';
    (data.tasks || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.task_id;
      opt.textContent = `${t.subject_code}: ${t.title}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load tasks for dropdown:', err);
  }
}

async function loadSessionHistory() {
  const container = document.getElementById('session-history-container');
  try {
    const data = await API.get('/api/study-sessions');
    container.innerHTML = '';

    if (!data.sessions || data.sessions.length === 0) {
      container.innerHTML = '<div style="font-size: 13px; color: var(--text-secondary);">No focus sessions logged yet. Complete a study interval to record your progress.</div>';
      return;
    }

    data.sessions.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = 'background: var(--surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm); padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;';

      const taskName = s.task_title ? `${s.subject_code ? s.subject_code + ' — ' : ''}${s.task_title}` : 'Independent focus session';
      row.innerHTML = `
        <div>
          <span style="font-weight: 500;">${escapeHTML(taskName)}</span>
          <span class="secondary tabular" style="font-size: 11.5px; margin-left: 8px;">${s.planned_date}</span>
        </div>
        <span class="tabular" style="font-weight: 600; color: var(--status-teal-text);">${s.duration_minutes} mins</span>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load sessions history:', err);
  }
}

function setupScheduleGenerator() {
  const btn = document.getElementById('btn-generate-schedule');
  btn.addEventListener('click', () => {
    const totalMins = Number(document.getElementById('cfg-available-mins').value) || 120;
    const blockMins = Number(document.getElementById('cfg-block-mins').value) || 25;
    const breakMins = Number(document.getElementById('cfg-break-mins').value) || 5;

    // Update timer to blockMins
    initialBlockSeconds = blockMins * 60;
    timerSeconds = initialBlockSeconds;
    updateTimerDisplay();

    const output = document.getElementById('schedule-output-list');
    output.innerHTML = '';

    let currentMin = 0;
    let blockIndex = 1;

    while (currentMin + blockMins <= totalMins) {
      const blockEl = document.createElement('div');
      blockEl.style.cssText = 'padding: 6px 10px; background: var(--surface); border-radius: var(--radius-sm); display: flex; justify-content: space-between;';
      blockEl.innerHTML = `
        <span style="font-weight: 600;">Block ${blockIndex}: Study</span>
        <span class="tabular">${currentMin} – ${currentMin + blockMins} min (${blockMins}m)</span>
      `;
      output.appendChild(blockEl);
      currentMin += blockMins;
      blockIndex++;

      if (currentMin + breakMins <= totalMins) {
        const breakEl = document.createElement('div');
        breakEl.style.cssText = 'padding: 4px 10px; font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between;';
        breakEl.innerHTML = `
          <span>Rest / Break</span>
          <span class="tabular">${currentMin} – ${currentMin + breakMins} min (${breakMins}m)</span>
        `;
        output.appendChild(breakEl);
        currentMin += breakMins;
      }
    }

    if (totalMins - currentMin > 0) {
      const remEl = document.createElement('div');
      remEl.style.cssText = 'font-size: 11.5px; color: var(--text-muted); margin-top: 4px;';
      remEl.textContent = `${totalMins - currentMin} minutes buffer remaining at end.`;
      output.appendChild(remEl);
    }
  });
}

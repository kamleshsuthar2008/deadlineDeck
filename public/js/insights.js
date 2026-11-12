/**
 * DeadlineDeck - Insights & Reports Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  await loadReports();
});

async function loadReports() {
  try {
    const data = await API.get('/api/reports/overview');
    const s = data.summary;

    const summaryEl = document.getElementById('report-editorial-text') || document.getElementById('editorial-summary-text');
    if (summaryEl) summaryEl.textContent = data.editorial_summary;

    const totalEl = document.getElementById('metric-total-tasks') || document.getElementById('stat-rep-total');
    if (totalEl) totalEl.textContent = s.total_tasks;

    const completedEl = document.getElementById('metric-completed-tasks') || document.getElementById('stat-rep-completed');
    if (completedEl) completedEl.textContent = s.completed_tasks;

    const pendingEl = document.getElementById('metric-pending-tasks');
    if (pendingEl) pendingEl.textContent = s.pending_tasks !== undefined ? s.pending_tasks : (s.total_tasks - s.completed_tasks);

    const rateEl = document.getElementById('metric-completion-rate') || document.getElementById('stat-rep-rate');
    if (rateEl) rateEl.textContent = `${s.completion_rate}%`;

    const overloadEl = document.getElementById('metric-overloaded-days') || document.getElementById('stat-rep-overloaded-days');
    if (overloadEl) overloadEl.textContent = s.overloaded_days_past_month;

    const container = document.getElementById('subject-distribution-chart') || document.getElementById('reports-subject-bars');
    if (!container) return;
    container.innerHTML = '';

    if (!data.subject_distribution || data.subject_distribution.length === 0) {
      container.innerHTML = '<div style="font-size: 13px; color: var(--text-secondary);">No subject records found.</div>';
      return;
    }

    const maxTasks = Math.max(...data.subject_distribution.map(d => d.total_tasks), 1);

    data.subject_distribution.forEach(sub => {
      const pct = Math.round((sub.total_tasks / maxTasks) * 100);
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span style="font-weight: 500;">${escapeHTML(sub.subject_code)} — ${escapeHTML(sub.subject_name)}</span>
          <span class="secondary tabular">${sub.completed_tasks} of ${sub.total_tasks} completed (${sub.pending_hours}h pending)</span>
        </div>
        <div class="subject-bar-track" style="height: 8px;">
          <div class="subject-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

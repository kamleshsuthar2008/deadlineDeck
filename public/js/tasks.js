/**
 * DeadlineDeck - Tasks Ledger Controller
 */

let allSubjects = [];
let currentFilter = {
  search: '',
  subject_id: '',
  task_type: '',
  priority: '',
  status: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  await loadSubjects();
  setupFilterListeners();
  setupModalForm();
  await loadTasks();
});

async function loadSubjects() {
  try {
    const data = await API.get('/api/subjects');
    allSubjects = data.subjects || [];

    const filterSelect = document.getElementById('filter-subject');
    const modalSelect = document.getElementById('dlg-subject');

    filterSelect.innerHTML = '<option value="">All subjects</option>';
    modalSelect.innerHTML = '';

    allSubjects.forEach(s => {
      const opt1 = document.createElement('option');
      opt1.value = s.subject_id;
      opt1.textContent = `${s.subject_code} — ${s.subject_name}`;
      filterSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = s.subject_id;
      opt2.textContent = `${s.subject_code} — ${s.subject_name}`;
      modalSelect.appendChild(opt2);
    });
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
}

function setupFilterListeners() {
  const searchInput = document.getElementById('filter-search');
  const subjectSelect = document.getElementById('filter-subject');
  const typeSelect = document.getElementById('filter-type');
  const prioritySelect = document.getElementById('filter-priority');
  const statusSelect = document.getElementById('filter-status');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentFilter.search = searchInput.value.trim();
      renderFilterTokens();
      loadTasks();
    }, 250);
  });

  subjectSelect.addEventListener('change', () => {
    currentFilter.subject_id = subjectSelect.value;
    renderFilterTokens();
    loadTasks();
  });

  typeSelect.addEventListener('change', () => {
    currentFilter.task_type = typeSelect.value;
    renderFilterTokens();
    loadTasks();
  });

  prioritySelect.addEventListener('change', () => {
    currentFilter.priority = prioritySelect.value;
    renderFilterTokens();
    loadTasks();
  });

  statusSelect.addEventListener('change', () => {
    currentFilter.status = statusSelect.value;
    renderFilterTokens();
    loadTasks();
  });
}

function renderFilterTokens() {
  const container = document.getElementById('active-tokens-container');
  container.innerHTML = '';

  const activeKeys = Object.entries(currentFilter).filter(([_, val]) => Boolean(val));
  if (activeKeys.length === 0) return;

  activeKeys.forEach(([key, val]) => {
    let displayVal = val;
    if (key === 'subject_id') {
      const sub = allSubjects.find(s => String(s.subject_id) === String(val));
      displayVal = sub ? sub.subject_code : val;
    }

    const token = document.createElement('span');
    token.className = 'filter-token';
    token.innerHTML = `
      <span>${key}: <strong>${escapeHTML(displayVal)}</strong></span>
      <button aria-label="Remove filter">&times;</button>
    `;
    token.querySelector('button').addEventListener('click', () => {
      currentFilter[key] = '';
      const input = document.getElementById(`filter-${key === 'subject_id' ? 'subject' : key}`);
      if (input) input.value = '';
      renderFilterTokens();
      loadTasks();
    });
    container.appendChild(token);
  });

  const clearAllBtn = document.createElement('button');
  clearAllBtn.className = 'btn btn-ghost';
  clearAllBtn.style.cssText = 'font-size: 11.5px; height: 24px; padding: 0 6px;';
  clearAllBtn.textContent = 'Clear all filters';
  clearAllBtn.addEventListener('click', () => {
    currentFilter = { search: '', subject_id: '', task_type: '', priority: '', status: '' };
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-subject').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-priority').value = '';
    document.getElementById('filter-status').value = '';
    renderFilterTokens();
    loadTasks();
  });
  container.appendChild(clearAllBtn);
}

async function loadTasks() {
  const tbody = document.getElementById('tasks-tbody');
  const emptyState = document.getElementById('tasks-empty-state');
  const table = document.getElementById('tasks-table');

  const params = new URLSearchParams();
  if (currentFilter.search) params.set('search', currentFilter.search);
  if (currentFilter.subject_id) params.set('subject_id', currentFilter.subject_id);
  if (currentFilter.task_type) params.set('task_type', currentFilter.task_type);
  if (currentFilter.priority) params.set('priority', currentFilter.priority);
  if (currentFilter.status) params.set('status', currentFilter.status);

  try {
    const data = await API.get(`/api/tasks?${params.toString()}`);
    tbody.innerHTML = '';

    if (!data.tasks || data.tasks.length === 0) {
      table.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    data.tasks.forEach(task => {
      const isCompleted = task.status === 'Completed';
      const tr = document.createElement('tr');
      if (isCompleted) tr.style.opacity = '0.65';

      const pClass = task.priority === 'High' ? 'p-high' : (task.priority === 'Medium' ? 'p-med' : 'p-low');
      const statusClass = task.status === 'Completed' ? 'is-balanced' : (task.status === 'In Progress' ? 'is-near-capacity' : 'is-not-configured');

      tr.innerHTML = `
        <td>
          <label class="custom-checkbox">
            <input type="checkbox" ${isCompleted ? 'checked' : ''} aria-label="Mark task complete">
          </label>
        </td>
        <td style="font-weight: 500; ${isCompleted ? 'text-decoration: line-through;' : ''}">
          ${escapeHTML(task.title)}
        </td>
        <td><span class="focus-subject-tag">${escapeHTML(task.subject_code)}</span></td>
        <td style="font-size: 13px;">${escapeHTML(task.task_type)}</td>
        <td class="tabular">${task.planned_date.substring(0, 10)}</td>
        <td class="tabular">${task.due_date.substring(0, 10)}</td>
        <td class="col-numeral tabular">${task.estimated_hours} h</td>
        <td>
          <div class="priority-indicator">
            <div class="priority-mark ${pClass}"><span></span><span></span><span></span></div>
            <span>${task.priority}</span>
          </div>
        </td>
        <td>
          <div class="status-chip ${statusClass}">
            <span class="status-dot"></span>
            <span>${task.status}</span>
          </div>
        </td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="btn btn-ghost btn-edit-task" style="padding: 4px;" title="Edit task">
              <svg style="width:16px;height:16px;"><use href="/icons.svg#icon-edit"></use></svg>
            </button>
            <button class="btn btn-danger-ghost btn-delete-task" style="padding: 4px;" title="Delete task">
              <svg style="width:16px;height:16px;"><use href="/icons.svg#icon-trash"></use></svg>
            </button>
          </div>
        </td>
      `;

      // Checkbox complete toggle
      const chk = tr.querySelector('input[type="checkbox"]');
      chk.addEventListener('change', async () => {
        const newStatus = chk.checked ? 'Completed' : 'Pending';
        try {
          await API.patch(`/api/tasks/${task.task_id}/status`, { status: newStatus });
          UI.showToast(`Task marked as ${newStatus}`);
          loadTasks();
        } catch (err) {
          chk.checked = !chk.checked;
          UI.showToast(err.message, 'error');
        }
      });

      // Edit action
      tr.querySelector('.btn-edit-task').addEventListener('click', () => openEditDialog(task));

      // Delete action
      tr.querySelector('.btn-delete-task').addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
        try {
          await API.delete(`/api/tasks/${task.task_id}`);
          UI.showToast('Task deleted successfully.');
          loadTasks();
        } catch (err) {
          UI.showToast(err.message, 'error');
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load tasks:', err);
  }
}

function openEditDialog(task) {
  document.getElementById('dialog-heading').textContent = 'Edit academic task';
  document.getElementById('modal-task-id').value = task.task_id;
  document.getElementById('dlg-title').value = task.title;
  document.getElementById('dlg-subject').value = task.subject_id;
  document.getElementById('dlg-type').value = task.task_type;
  document.getElementById('dlg-planned').value = task.planned_date.substring(0, 10);
  document.getElementById('dlg-due').value = task.due_date.substring(0, 10);
  document.getElementById('dlg-hours').value = task.estimated_hours;
  document.getElementById('dlg-priority').value = task.priority;
  document.getElementById('dlg-status').value = task.status;
  document.getElementById('dlg-desc').value = task.description || '';

  UI.openModal('task-dialog');
}

function setupModalForm() {
  document.getElementById('btn-add-new-task').addEventListener('click', () => {
    document.getElementById('dialog-heading').textContent = 'Create academic task';
    document.getElementById('modal-task-id').value = '';
    document.getElementById('dialog-form').reset();
    const todayStr = new Date().toISOString().substring(0, 10);
    document.getElementById('dlg-planned').value = todayStr;
    document.getElementById('dlg-due').value = todayStr;
    document.getElementById('dlg-hours').value = '1.00';
    UI.openModal('task-dialog');
  });

  document.getElementById('dialog-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modal-task-id').value;
    const body = {
      title: document.getElementById('dlg-title').value,
      subject_id: document.getElementById('dlg-subject').value,
      task_type: document.getElementById('dlg-type').value,
      planned_date: document.getElementById('dlg-planned').value,
      due_date: document.getElementById('dlg-due').value,
      estimated_hours: document.getElementById('dlg-hours').value,
      priority: document.getElementById('dlg-priority').value,
      status: document.getElementById('dlg-status').value,
      description: document.getElementById('dlg-desc').value
    };

    try {
      if (id) {
        await API.put(`/api/tasks/${id}`, body);
        UI.showToast('Task updated successfully.');
      } else {
        await API.post('/api/tasks', body);
        UI.showToast('Task created successfully.');
      }
      UI.closeModal('task-dialog');
      loadTasks();
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  });
}

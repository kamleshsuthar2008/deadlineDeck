/**
 * DeadlineDeck - Assignment Checklist Builder Tool Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init(true);

  setupChecklistModal();
  await loadTasksDropdown();
  await loadChecklists();
});

async function loadTasksDropdown() {
  try {
    const data = await API.get('/api/tasks');
    const select = document.getElementById('cl-task');
    select.innerHTML = '<option value="">No linked task</option>';
    (data.tasks || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.task_id;
      opt.textContent = `${t.subject_code}: ${t.title}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load tasks for checklist dropdown:', err);
  }
}

async function loadChecklists() {
  const container = document.getElementById('checklists-container');
  try {
    const data = await API.get('/api/checklists');
    container.innerHTML = '';

    if (!data.checklists || data.checklists.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-48) var(--space-16);">
          <svg style="width:40px;height:40px;stroke:var(--text-muted);"><use href="/icons.svg#icon-tasks"></use></svg>
          <div class="empty-state-title">No assignment checklists created</div>
          <div class="empty-state-text">Create structured step-by-step checklists to keep track of lab reports, code reviews, and project submissions.</div>
        </div>
      `;
      return;
    }

    data.checklists.forEach(cl => {
      const panel = document.createElement('div');
      panel.className = 'panel';

      const taskTag = cl.task_title ? `<span class="focus-subject-tag" style="margin-left:8px;">Linked: ${escapeHTML(cl.task_title)}</span>` : '';

      panel.innerHTML = `
        <div class="panel-header">
          <div>
            <div style="display: flex; align-items: center;">
              <h2 class="section-title">${escapeHTML(cl.title)}</h2>
              ${taskTag}
            </div>
            <span class="secondary tabular" style="font-size: 12px; margin-top: 2px;">
              ${cl.completed_items} of ${cl.total_items} items completed (${cl.completion_percentage}%)
            </span>
          </div>
          <div style="display: flex; gap: var(--space-8); align-items: center;">
            <button class="btn btn-danger-ghost btn-delete-cl" style="padding: 4px;" title="Delete checklist">
              <svg style="width:16px;height:16px;"><use href="/icons.svg#icon-trash"></use></svg>
            </button>
          </div>
        </div>
        <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--space-12);">
          <!-- Progress bar -->
          <div class="subject-bar-track" style="height: 6px;">
            <div class="subject-bar-fill" style="width: ${cl.completion_percentage}%;"></div>
          </div>

          <!-- Items list -->
          <div class="cl-items-list" style="display: flex; flex-direction: column; gap: 6px;"></div>

          <!-- Add Item Row -->
          <form class="cl-add-item-form" style="display: flex; gap: var(--space-8); margin-top: var(--space-8);">
            <input type="text" class="input-text cl-new-item-input" placeholder="Add checklist item..." style="height: 34px; font-size: 13px;" required>
            <button type="submit" class="btn btn-secondary" style="height: 34px; font-size: 12.5px;">Add</button>
          </form>
        </div>
      `;

      // Render items
      const itemsContainer = panel.querySelector('.cl-items-list');
      cl.items.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-radius: var(--radius-sm); transition: background 0.15s;';
        itemRow.innerHTML = `
          <label class="custom-checkbox" style="font-size: 13px; ${item.is_completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
            <input type="checkbox" ${item.is_completed ? 'checked' : ''}>
            <span>${escapeHTML(item.item_text)}</span>
          </label>
          <button class="btn btn-ghost btn-del-item" style="padding: 2px 6px;" title="Delete item">
            <svg style="width:14px;height:14px;"><use href="/icons.svg#icon-trash"></use></svg>
          </button>
        `;

        const chk = itemRow.querySelector('input[type="checkbox"]');
        chk.addEventListener('change', async () => {
          try {
            await API.patch(`/api/checklists/items/${item.item_id}/toggle`);
            loadChecklists();
          } catch (err) {
            chk.checked = !chk.checked;
            UI.showToast(err.message, 'error');
          }
        });

        itemRow.querySelector('.btn-del-item').addEventListener('click', async () => {
          try {
            await API.delete(`/api/checklists/items/${item.item_id}`);
            loadChecklists();
          } catch (err) {
            UI.showToast(err.message, 'error');
          }
        });

        itemsContainer.appendChild(itemRow);
      });

      // Add item form
      panel.querySelector('.cl-add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = panel.querySelector('.cl-new-item-input');
        const text = input.value.trim();
        if (!text) return;

        try {
          await API.post(`/api/checklists/${cl.checklist_id}/items`, { item_text: text });
          input.value = '';
          loadChecklists();
        } catch (err) {
          UI.showToast(err.message, 'error');
        }
      });

      // Delete checklist
      panel.querySelector('.btn-delete-cl').addEventListener('click', async () => {
        if (!confirm(`Delete checklist "${cl.title}"?`)) return;
        try {
          await API.delete(`/api/checklists/${cl.checklist_id}`);
          UI.showToast('Checklist deleted.');
          loadChecklists();
        } catch (err) {
          UI.showToast(err.message, 'error');
        }
      });

      container.appendChild(panel);
    });
  } catch (err) {
    console.error('Failed to load checklists:', err);
  }
}

function setupChecklistModal() {
  document.getElementById('btn-create-checklist').addEventListener('click', () => {
    document.getElementById('checklist-form').reset();
    UI.openModal('checklist-modal');
  });

  document.getElementById('checklist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('cl-title').value.trim();
    const taskId = document.getElementById('cl-task').value;

    try {
      await API.post('/api/checklists', { title, task_id: taskId || null });
      UI.closeModal('checklist-modal');
      UI.showToast('Checklist created.');
      loadChecklists();
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  });
}

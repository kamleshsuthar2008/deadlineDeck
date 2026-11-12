/**
 * DeadlineDeck - Subjects Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  setupModal();
  await loadSubjects();
});

function openEditSubjectModal(sub) {
  const heading = document.getElementById('modal-subject-heading') || document.getElementById('subject-modal-heading');
  if (heading) heading.textContent = 'Edit academic subject';

  const idInput = document.getElementById('edit-subject-id') || document.getElementById('modal-sub-id');
  if (idInput) idInput.value = sub.subject_id;

  const codeInput = document.getElementById('dlg-subject-code') || document.getElementById('sub-code');
  if (codeInput) codeInput.value = sub.subject_code;

  const nameInput = document.getElementById('dlg-subject-name') || document.getElementById('sub-name');
  if (nameInput) nameInput.value = sub.subject_name;

  const modalId = document.getElementById('modal-subject-editor') ? 'modal-subject-editor' : 'subject-modal';
  UI.openModal(modalId);
}

async function deleteSubject(sub) {
  if (!confirm(`Are you sure you want to delete ${sub.subject_code}: ${sub.subject_name}?`)) return;

  try {
    await API.delete(`/api/subjects/${sub.subject_id}`);
    UI.showToast('Subject deleted successfully.');
    loadSubjects();
  } catch (err) {
    alert(err.message || 'Cannot delete subject that contains active tasks.');
  }
}

async function loadSubjects() {
  const container = document.getElementById('subjects-container');
  const tbody = document.getElementById('subjects-tbody');

  try {
    const data = await API.get('/api/subjects');

    if (container) {
      container.innerHTML = '';
      if (!data.subjects || data.subjects.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: var(--space-48) var(--space-20); text-align: center;">
            <h3 style="font-size: 16px; font-weight: 600;">No course subjects enrolled</h3>
            <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: 4px;">Click "+ Add Subject" to start organizing your coursework by subject code.</p>
          </div>
        `;
        return;
      }

      data.subjects.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        const pendingCount = sub.pending_tasks !== undefined ? sub.pending_tasks : (sub.total_tasks - (sub.completed_tasks || 0));
        const pendingHours = sub.pending_hours || 0;

        card.innerHTML = `
          <div class="subject-header-row">
            <div>
              <span class="subject-code-badge">${escapeHTML(sub.subject_code)}</span>
              <h2 style="font-size: 17px; font-weight: 600; margin-top: 8px;">${escapeHTML(sub.subject_name)}</h2>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-ghost btn-sm btn-edit-sub" title="Edit subject" style="padding: 4px 6px;">
                <svg style="width:15px;height:15px;"><use href="/icons.svg#icon-edit"></use></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-delete-sub" title="Delete subject" style="padding: 4px 6px; color: var(--danger);">
                <svg style="width:15px;height:15px;"><use href="/icons.svg#icon-trash"></use></svg>
              </button>
            </div>
          </div>

          <div class="subject-stats-grid">
            <div>
              <div class="subject-stat-num tabular">${sub.total_tasks || 0}</div>
              <div class="subject-stat-label">Total Tasks</div>
            </div>
            <div>
              <div class="subject-stat-num tabular">${pendingCount}</div>
              <div class="subject-stat-label">Pending</div>
            </div>
            <div>
              <div class="subject-stat-num tabular">${pendingHours}h</div>
              <div class="subject-stat-label">Workload</div>
            </div>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between;">
            <span>Next Due: <strong class="tabular" style="color: var(--text-primary);">${sub.next_deadline ? sub.next_deadline.substring(0, 10) : 'None'}</strong></span>
            <span>Completed: <strong class="tabular" style="color: var(--success);">${sub.completed_tasks || 0}</strong></span>
          </div>
        `;

        card.querySelector('.btn-edit-sub').addEventListener('click', () => {
          openEditSubjectModal(sub);
        });

        card.querySelector('.btn-delete-sub').addEventListener('click', () => {
          deleteSubject(sub);
        });

        container.appendChild(card);
      });
      return;
    }

    if (tbody) {
      tbody.innerHTML = '';
      if (!data.subjects || data.subjects.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: var(--space-32); color: var(--text-secondary);">
              No subjects enrolled yet. Add your first academic subject above.
            </td>
          </tr>
        `;
        return;
      }

      data.subjects.forEach(sub => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="focus-subject-tag" style="font-size: 12px; font-weight: 600;">${escapeHTML(sub.subject_code)}</span></td>
          <td style="font-weight: 500;">${escapeHTML(sub.subject_name)}</td>
          <td class="col-numeral tabular">${sub.total_tasks}</td>
          <td class="col-numeral tabular">${sub.pending_tasks}</td>
          <td class="col-numeral tabular">${sub.completed_tasks}</td>
          <td class="col-numeral tabular">${sub.pending_hours} h</td>
          <td class="tabular">${sub.next_deadline ? sub.next_deadline.substring(0, 10) : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td class="col-actions">
            <div class="row-actions">
              <button class="btn btn-ghost btn-edit-sub" style="padding: 4px;" title="Edit subject">
                <svg style="width:16px;height:16px;"><use href="/icons.svg#icon-edit"></use></svg>
              </button>
              <button class="btn btn-danger-ghost btn-delete-sub" style="padding: 4px;" title="Delete subject">
                <svg style="width:16px;height:16px;"><use href="/icons.svg#icon-trash"></use></svg>
              </button>
            </div>
          </td>
        `;

        tr.querySelector('.btn-edit-sub').addEventListener('click', () => {
          openEditSubjectModal(sub);
        });

        tr.querySelector('.btn-delete-sub').addEventListener('click', () => {
          deleteSubject(sub);
        });

        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
}

function setupModal() {
  const addBtn = document.getElementById('btn-open-create-subject') || document.getElementById('btn-add-subject');
  const form = document.getElementById('form-subject-editor') || document.getElementById('subject-form');
  const modalId = document.getElementById('modal-subject-editor') ? 'modal-subject-editor' : 'subject-modal';

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const heading = document.getElementById('modal-subject-heading') || document.getElementById('subject-modal-heading');
      if (heading) heading.textContent = 'Add academic subject';

      const idInput = document.getElementById('edit-subject-id') || document.getElementById('modal-sub-id');
      if (idInput) idInput.value = '';

      if (form) form.reset();
      UI.openModal(modalId);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idInput = document.getElementById('edit-subject-id') || document.getElementById('modal-sub-id');
      const id = idInput ? idInput.value : '';

      const codeInput = document.getElementById('dlg-subject-code') || document.getElementById('sub-code');
      const nameInput = document.getElementById('dlg-subject-name') || document.getElementById('sub-name');

      const body = {
        subject_code: codeInput ? codeInput.value.trim() : '',
        subject_name: nameInput ? nameInput.value.trim() : ''
      };

      try {
        if (id) {
          await API.put(`/api/subjects/${id}`, body);
          UI.showToast('Subject updated successfully.');
        } else {
          await API.post('/api/subjects', body);
          UI.showToast('Subject added successfully.');
        }
        UI.closeModal(modalId);
        loadSubjects();
      } catch (err) {
        UI.showToast(err.message, 'error');
      }
    });
  }
}

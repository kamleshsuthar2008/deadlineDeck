/**
 * DeadlineDeck - Subjects Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  setupModal();
  await loadSubjects();
});

async function loadSubjects() {
  const tbody = document.getElementById('subjects-tbody');
  try {
    const data = await API.get('/api/subjects');
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
        document.getElementById('subject-modal-heading').textContent = 'Edit academic subject';
        document.getElementById('modal-sub-id').value = sub.subject_id;
        document.getElementById('sub-code').value = sub.subject_code;
        document.getElementById('sub-name').value = sub.subject_name;
        UI.openModal('subject-modal');
      });

      tr.querySelector('.btn-delete-sub').addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete ${sub.subject_code}: ${sub.subject_name}?`)) return;

        try {
          await API.delete(`/api/subjects/${sub.subject_id}`);
          UI.showToast('Subject deleted successfully.');
          loadSubjects();
        } catch (err) {
          // If tasks exist, 409 Conflict provides clear explanation
          alert(err.message || 'Cannot delete subject that contains active tasks.');
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
}

function setupModal() {
  document.getElementById('btn-add-subject').addEventListener('click', () => {
    document.getElementById('subject-modal-heading').textContent = 'Add academic subject';
    document.getElementById('modal-sub-id').value = '';
    document.getElementById('subject-form').reset();
    UI.openModal('subject-modal');
  });

  document.getElementById('subject-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modal-sub-id').value;
    const body = {
      subject_code: document.getElementById('sub-code').value.trim(),
      subject_name: document.getElementById('sub-name').value.trim()
    };

    try {
      if (id) {
        await API.put(`/api/subjects/${id}`, body);
        UI.showToast('Subject updated successfully.');
      } else {
        await API.post('/api/subjects', body);
        UI.showToast('Subject added successfully.');
      }
      UI.closeModal('subject-modal');
      loadSubjects();
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  });
}

/**
 * DeadlineDeck - Quick Notes Tool Controller
 */

let allNotes = [];
let selectedNote = null;

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init(true);

  await loadSubjectsDropdown();
  setupEditorActions();
  await loadNotes();
});

async function loadSubjectsDropdown() {
  try {
    const data = await API.get('/api/subjects');
    const select = document.getElementById('edit-note-subject');
    select.innerHTML = '<option value="">No subject linked</option>';
    (data.subjects || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.subject_id;
      opt.textContent = `${s.subject_code} — ${s.subject_name}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load subjects for notes:', err);
  }
}

async function loadNotes(searchQuery = '') {
  const container = document.getElementById('notes-list');
  try {
    const endpoint = searchQuery ? `/api/notes?search=${encodeURIComponent(searchQuery)}` : '/api/notes';
    const data = await API.get(endpoint);
    allNotes = data.notes || [];
    container.innerHTML = '';

    if (allNotes.length === 0) {
      container.innerHTML = '<div style="font-size: 13px; color: var(--text-secondary); padding: var(--space-12);">No notes found. Create your first note.</div>';
      clearEditor();
      return;
    }

    allNotes.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card-item ${note.is_pinned ? 'is-pinned' : ''} ${selectedNote && selectedNote.note_id === note.note_id ? 'is-selected' : ''}`;
      card.setAttribute('data-id', note.note_id);

      const pinIcon = note.is_pinned ? '<svg style="width:12px;height:12px;stroke:var(--accent);fill:var(--accent);"><use href="/icons.svg#icon-pin"></use></svg>' : '';
      const subTag = note.subject_code ? `<span class="focus-subject-tag">${escapeHTML(note.subject_code)}</span>` : '';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${pinIcon}
            <span style="font-weight: 600; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHTML(note.title)}
            </span>
          </div>
          ${subTag}
        </div>
        <div style="font-size: 11.5px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHTML(note.content ? note.content.substring(0, 50) : 'Empty note')}
        </div>
      `;

      card.addEventListener('click', () => {
        selectNote(note);
      });

      container.appendChild(card);
    });

    if (!selectedNote && allNotes.length > 0) {
      selectNote(allNotes[0]);
    }
  } catch (err) {
    console.error('Failed to load notes:', err);
  }
}

function selectNote(note) {
  selectedNote = note;
  document.querySelectorAll('.note-card-item').forEach(el => {
    el.classList.toggle('is-selected', Number(el.getAttribute('data-id')) === note.note_id);
  });

  document.getElementById('editor-header-title').textContent = note.title;
  document.getElementById('edit-note-id').value = note.note_id;
  document.getElementById('edit-note-title').value = note.title;
  document.getElementById('edit-note-subject').value = note.subject_id || '';
  document.getElementById('edit-note-content').value = note.content || '';

  const pinBtn = document.getElementById('btn-pin-note');
  pinBtn.title = note.is_pinned ? 'Unpin note' : 'Pin note';
  pinBtn.style.color = note.is_pinned ? 'var(--accent)' : 'inherit';
}

function clearEditor() {
  selectedNote = null;
  document.getElementById('editor-header-title').textContent = 'New Note';
  document.getElementById('edit-note-id').value = '';
  document.getElementById('edit-note-title').value = '';
  document.getElementById('edit-note-subject').value = '';
  document.getElementById('edit-note-content').value = '';
  document.querySelectorAll('.note-card-item').forEach(el => el.classList.remove('is-selected'));
}

function setupEditorActions() {
  // New Note
  document.getElementById('btn-new-note').addEventListener('click', () => {
    clearEditor();
    document.getElementById('edit-note-title').focus();
  });

  // Search Notes
  let debounce = null;
  document.getElementById('note-search').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      loadNotes(e.target.value.trim());
    }, 250);
  });

  // Save Note
  document.getElementById('note-editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-note-id').value;
    const title = document.getElementById('edit-note-title').value.trim();
    const subject_id = document.getElementById('edit-note-subject').value || null;
    const content = document.getElementById('edit-note-content').value;

    try {
      if (id) {
        await API.put(`/api/notes/${id}`, { title, subject_id, content, is_pinned: selectedNote?.is_pinned });
        UI.showToast('Note updated.');
      } else {
        const res = await API.post('/api/notes', { title, subject_id, content, is_pinned: false });
        UI.showToast('Note created.');
        selectedNote = res.note;
      }
      await loadNotes();
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  });

  // Pin Note
  document.getElementById('btn-pin-note').addEventListener('click', async () => {
    const id = document.getElementById('edit-note-id').value;
    if (!id) return;

    try {
      const res = await API.patch(`/api/notes/${id}/pin`);
      UI.showToast(res.is_pinned ? 'Note pinned to top.' : 'Note unpinned.');
      if (selectedNote) selectedNote.is_pinned = res.is_pinned;
      await loadNotes();
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  });

  // Delete Note
  document.getElementById('btn-delete-note').addEventListener('click', async () => {
    const id = document.getElementById('edit-note-id').value;
    if (!id) return;

    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await API.delete(`/api/notes/${id}`);
      UI.showToast('Note deleted.');
      clearEditor();
      await loadNotes();
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  });
}

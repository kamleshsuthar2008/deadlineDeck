/**
 * DeadlineDeck - Settings & Capacity Configuration Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.init(true);
  if (!user) return;

  populateProfileForm(user);
  setupProfileForm();
  setupPasswordForm();
  setupCapacityOverrideForm();
  await loadCapacityOverrides();
});

function populateProfileForm(user) {
  const nameEl = document.getElementById('setting-name');
  if (nameEl) nameEl.value = user.name || '';

  const emailEl = document.getElementById('setting-email');
  if (emailEl) emailEl.value = user.email || '';

  const hoursEl = document.getElementById('setting-study-hours') || document.getElementById('setting-default-hours');
  if (hoursEl) hoursEl.value = user.default_study_hours || 4.00;
}

function setupProfileForm() {
  const form = document.getElementById('form-profile-settings') || document.getElementById('form-profile');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('setting-name');
    const hoursEl = document.getElementById('setting-study-hours') || document.getElementById('setting-default-hours');

    try {
      const res = await API.put('/api/auth/profile', {
        name: nameEl ? nameEl.value.trim() : '',
        default_study_hours: hoursEl ? hoursEl.value : 4.00
      });
      UI.showToast('Profile and default study capacity saved.');
      if (Auth.currentUser && res.user) {
        Auth.currentUser.name = res.user.name;
        Auth.currentUser.default_study_hours = res.user.default_study_hours;
        Auth.syncUserHeader();
      }
    } catch (err) {
      UI.showToast(err.message || 'Failed to update profile', 'error');
    }
  });
}

function setupPasswordForm() {
  const form = document.getElementById('form-password-settings') || document.getElementById('form-password');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curPw = document.getElementById('setting-current-pw') || document.getElementById('current-pwd');
    const newPw = document.getElementById('setting-new-pw') || document.getElementById('new-pwd');

    try {
      await API.put('/api/auth/password', {
        current_password: curPw ? curPw.value : '',
        new_password: newPw ? newPw.value : ''
      });
      UI.showToast('Password updated successfully.');
      form.reset();
    } catch (err) {
      UI.showToast(err.message || 'Failed to update password', 'error');
    }
  });
}

async function loadCapacityOverrides() {
  const container = document.getElementById('overrides-list');
  if (!container) return;

  try {
    const data = await API.get('/api/capacity');
    container.innerHTML = '';

    if (!data.overrides || data.overrides.length === 0) {
      container.innerHTML = '<div style="font-size: 13px; color: var(--text-secondary);">No date overrides configured. All days currently use your default study hours.</div>';
      return;
    }

    data.overrides.forEach(ov => {
      const row = document.createElement('div');
      row.style.cssText = 'background: var(--surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm); padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-12);">
          <span class="tabular" style="font-weight: 600; font-size: 13.5px;">${ov.capacity_date}</span>
          <span class="tabular" style="font-size: 13px; color: var(--text-primary);">${ov.available_hours} hours available</span>
        </div>
        <button class="btn btn-danger-ghost btn-remove-override" style="padding: 2px 8px; font-size: 12px;">Remove override</button>
      `;

      row.querySelector('.btn-remove-override').addEventListener('click', async () => {
        try {
          await API.delete(`/api/capacity/${ov.capacity_date}`);
          UI.showToast(`Override removed for ${ov.capacity_date}.`);
          loadCapacityOverrides();
        } catch (err) {
          UI.showToast(err.message || 'Failed to remove override', 'error');
        }
      });

      container.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load capacity overrides:', err);
  }
}

function setupCapacityOverrideForm() {
  const form = document.getElementById('form-add-override') || document.getElementById('form-capacity-override');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('override-date').value;
    const hours = document.getElementById('override-hours').value;

    if (!date) return;

    try {
      await API.put(`/api/capacity/${date}`, { available_hours: hours });
      UI.showToast(`Capacity for ${date} set to ${hours}h.`);
      loadCapacityOverrides();
    } catch (err) {
      UI.showToast(err.message || 'Failed to save capacity override', 'error');
    }
  });
}

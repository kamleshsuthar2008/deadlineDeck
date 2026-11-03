/**
 * DeadlineDeck - Core UI Utilities (Modal, Drawer, Toast, Focus Trap)
 */

const UI = {
  activeModal: null,
  previousFocusElement: null,

  init() {
    this.bindDrawer();
    this.bindModalDismissals();
  },

  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    const iconId = type === 'error' ? 'icon-alert' : 'icon-check';
    toast.innerHTML = `<svg><use href="/icons.svg#${iconId}"></use></svg><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    this.previousFocusElement = document.activeElement;
    this.activeModal = modal;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Focus first input or close button
    const focusable = modal.querySelector('input, select, textarea, button:not(.modal-close-btn)');
    if (focusable) focusable.focus();
  },

  closeModal(modalId) {
    const modal = modalId ? document.getElementById(modalId) : this.activeModal;
    if (!modal) return;

    modal.classList.remove('is-open');
    document.body.style.overflow = '';

    if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
      this.previousFocusElement.focus();
    }
    this.activeModal = null;
  },

  bindModalDismissals() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal();
      }
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeModal(backdrop.id);
        }
      });
    });

    document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) this.closeModal(modal.id);
      });
    });
  },

  bindDrawer() {
    const toggleBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
        overlay.classList.toggle('is-open');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-open');
      });
    }
  }
};

/**
 * Basic HTML escaping utility
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => UI.init());

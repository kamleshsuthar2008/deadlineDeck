/**
 * DeadlineDeck - Core UI Controller & Navigation Helper
 * Handles Horizontal Nav active states, Mobile Drawer, Modals, and Toasts.
 */

const UI = {
  activeModal: null,
  previousFocusElement: null,

  init() {
    this.highlightActiveNav();
    this.bindMobileDrawer();
    this.bindModalDismissals();
  },

  /**
   * Automatically sets .active on the horizontal nav link corresponding to the current URL.
   */
  highlightActiveNav() {
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-link, .nav-item-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkPath = href.toLowerCase().split('?')[0];

      let isMatch = false;
      if (linkPath === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))) {
        isMatch = true;
      } else if (linkPath !== '/' && currentPath.includes(linkPath.replace('.html', ''))) {
        isMatch = true;
      } else if (currentPath.includes('/tools/') && (linkPath.includes('toolkit') || linkPath.includes('tools'))) {
        isMatch = true;
      }

      if (isMatch) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  /**
   * Binds mobile hamburger toggle and drawer.
   */
  bindMobileDrawer() {
    const toggle = document.querySelector('.mobile-hamburger, .mobile-menu-toggle');
    const drawer = document.querySelector('.mobile-drawer');

    if (toggle && drawer) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
          drawer.classList.remove('open');
        }
      });
    }
  },

  /**
   * Show toast notification.
   */
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

  /**
   * Modal dialog management with focus preservation.
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    this.previousFocusElement = document.activeElement;
    this.activeModal = modal;
    modal.classList.add('is-open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    const focusable = modal.querySelector('input, select, textarea, button:not(.modal-close-btn)');
    if (focusable) focusable.focus();
  },

  closeModal(modalId) {
    const modal = modalId ? document.getElementById(modalId) : this.activeModal;
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.classList.remove('open');
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

    document.querySelectorAll('.modal-backdrop, .modal-overlay').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeModal(backdrop.id);
        }
      });
    });

    document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop, .modal-overlay');
        if (modal) this.closeModal(modal.id);
      });
    });
  }
};

/**
 * Universal HTML escape helper to prevent XSS.
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

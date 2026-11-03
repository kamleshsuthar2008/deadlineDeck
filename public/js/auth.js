/**
 * DeadlineDeck - Student Auth & Sidebar Session Handler
 */

const Auth = {
  currentUser: null,

  async init(protectPage = true) {
    try {
      const user = await API.get('/api/auth/me');
      this.currentUser = user;
      this.updateSidebarUser(user);
      this.bindLogout();
      return user;
    } catch (err) {
      if (protectPage) {
        window.location.href = '/login.html';
      }
      return null;
    }
  },

  updateSidebarUser(user) {
    if (!user) return;

    // Generate monogram (e.g. "Aarav Sharma" -> "AS")
    const names = (user.name || 'Student').trim().split(' ');
    const monogram = names.length > 1 
      ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
      : names[0].substring(0, 2).toUpperCase();

    const avatarEls = document.querySelectorAll('.user-avatar-monogram');
    avatarEls.forEach(el => el.textContent = monogram);

    const nameEls = document.querySelectorAll('.user-display-name');
    nameEls.forEach(el => el.textContent = user.name);

    const emailEls = document.querySelectorAll('.user-display-email');
    emailEls.forEach(el => el.textContent = user.email);
  },

  bindLogout() {
    const logoutBtns = document.querySelectorAll('.btn-sidebar-logout, [data-action="logout"]');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await API.post('/api/auth/logout');
          window.location.href = '/login.html';
        } catch (err) {
          window.location.href = '/login.html';
        }
      });
    });
  }
};

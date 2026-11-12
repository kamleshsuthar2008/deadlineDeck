/**
 * DeadlineDeck - Student Auth & Session State Handler
 */

const Auth = {
  currentUser: null,

  async init(protectPage = true) {
    try {
      const response = await API.get('/api/auth/me');
      const user = response.data?.user || response.user || response;
      this.currentUser = user;
      this.updateHeaderUser(user);
      this.bindLogout();
      return user;
    } catch (err) {
      if (protectPage) {
        window.location.href = '/login.html';
      }
      return null;
    }
  },

  updateHeaderUser(user) {
    if (!user) return;

    // Generate monogram (e.g. "Kamlesh Suthar" -> "KS")
    const names = (user.name || 'Student').trim().split(' ');
    const monogram = names.length > 1 
      ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
      : names[0].substring(0, 2).toUpperCase();

    const avatarEls = document.querySelectorAll('.user-avatar-monogram, .user-avatar-pill');
    avatarEls.forEach(el => el.textContent = monogram);

    const nameEls = document.querySelectorAll('.user-display-name, .student-greeting-name');
    nameEls.forEach(el => el.textContent = user.name || 'Student');

    const emailEls = document.querySelectorAll('.user-display-email');
    emailEls.forEach(el => el.textContent = user.email || '');
  },

  bindLogout() {
    const logoutBtns = document.querySelectorAll('.btn-nav-logout, .btn-sidebar-logout, [data-action="logout"]');
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

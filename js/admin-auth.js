const adminLoginForm = document.getElementById('admin-login-form');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminLoginError = document.getElementById('admin-login-error');
const STATIC_ADMIN_PASSWORD = 'dimzjie123';
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
  return 'http://localhost:3000';
})();

function displayAdminLoginError(message) {
  if (!adminLoginError) return;
  adminLoginError.textContent = message;
}

function completeAdminLogin() {
  localStorage.setItem('dimzjie_admin_authenticated', 'true');
  window.location.href = 'admin-dashboard.html';
}

adminLoginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const password = adminPasswordInput?.value.trim();
  if (!password) {
    displayAdminLoginError('Masukkan kata sandi terlebih dahulu.');
    return;
  }

  try {
    const resp = await fetch('/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        completeAdminLogin();
        return;
      }
      displayAdminLoginError(data.error || 'Kata sandi salah. Silakan coba lagi.');
      return;
    }

    // Jika backend tidak tersedia, gunakan fallback password lokal.
    if (password === STATIC_ADMIN_PASSWORD) {
      completeAdminLogin();
      return;
    }

    displayAdminLoginError('Aplikasi server tidak berjalan. Coba jalankan server atau periksa kata sandi.');
  } catch (err) {
    if (password === STATIC_ADMIN_PASSWORD) {
      completeAdminLogin();
      return;
    }
    displayAdminLoginError('Gagal memeriksa kata sandi. Coba lagi.');
  }
});


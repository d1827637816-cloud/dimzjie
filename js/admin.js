const adminNotifications = document.getElementById('admin-notifications');

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function renderNotifications(data) {
  if (!adminNotifications) return;

  if (!data || data.length === 0) {
    adminNotifications.innerHTML = '<p>Tidak ada notifikasi checkout saat ini.</p>';
    return;
  }

  const rows = data.map(item => `
    <div class="notification-card">
      <div class="notification-row">
        <div><strong>ID:</strong> ${item.id}</div>
        <div><strong>Status:</strong> ${item.status}</div>
      </div>
      <div class="notification-row">
        <div><strong>Nama:</strong> ${item.name}</div>
        <div><strong>Email:</strong> ${item.email}</div>
      </div>
      <div class="notification-row">
        <div><strong>Telepon:</strong> ${item.phone}</div>
        <div><strong>Transfer ke:</strong> ${item.transferredTo}</div>
      </div>
      <div class="notification-row">
        <div><strong>Total:</strong> ${formatPrice(item.total)}</div>
        <div><strong>Dibuat:</strong> ${new Date(item.createdAt).toLocaleString('id-ID')}</div>
      </div>
      ${item.proofPath ? `<div class="notification-row"><div><strong>Bukti Transfer:</strong> <a href="${item.proofPath}" target="_blank" rel="noopener noreferrer">${item.proofName || 'Lihat bukti'}</a></div></div>` : ''}
      <div class="notification-message">
        <strong>Alamat:</strong> ${item.address}
      </div>
    </div>
  `).join('');

  adminNotifications.innerHTML = rows;
}

fetch('/checkout-notifications')
  .then(response => response.json())
  .then(data => renderNotifications(data))
  .catch(() => {
    if (adminNotifications) {
      adminNotifications.innerHTML = '<p>Gagal memuat notifikasi. Silakan coba lagi nanti.</p>';
    }
  });

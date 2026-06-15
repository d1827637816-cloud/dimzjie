const orderHistoryList = document.getElementById('order-history-list');

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function getOrderHistory() {
  const stored = window.localStorage.getItem('dimzjie_order_history');
  return stored ? JSON.parse(stored) : [];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderOrderHistory() {
  const history = getOrderHistory();
  if (!orderHistoryList) return;

  if (history.length === 0) {
    orderHistoryList.innerHTML = '<p>Belum ada pesanan. Lakukan checkout untuk mulai berbelanja.</p>';
    return;
  }

  orderHistoryList.innerHTML = history.map(order => {
    const items = order.cart.map(item => `
      <div class="order-history-item">
        <strong>${item.name}</strong>
        <p>Jumlah: ${item.quantity}</p>
        <span>${formatPrice(item.price * item.quantity)}</span>
      </div>
    `).join('');

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <strong>No. Pesanan: ${order.id}</strong>
            <p>${formatDate(order.createdAt)}</p>
          </div>
          <div>
            <span class="order-status">${order.status}</span>
          </div>
        </div>
        <div class="order-meta">
          <p><strong>Nama:</strong> ${order.name}</p>
          <p><strong>Email:</strong> ${order.email}</p>
          <p><strong>Alamat:</strong> ${order.address}</p>
          <p><strong>Total:</strong> ${formatPrice(order.total)}</p>
        </div>
        <div class="order-details">
          ${items}
        </div>
      </div>
    `;
  }).join('');
}

renderOrderHistory();

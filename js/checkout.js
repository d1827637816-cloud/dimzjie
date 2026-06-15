const checkoutSummary = document.getElementById('checkout-summary');
const checkoutForm = document.getElementById('checkout-form');
const customerName = document.getElementById('customer-name');
const customerEmail = document.getElementById('customer-email');
const customerPhone = document.getElementById('customer-phone');
const customerAddress = document.getElementById('customer-address');
const transferAmountEl = document.getElementById('transfer-amount');
const transferAmountLabel = document.getElementById('transfer-amount-label');

const CART_KEY = 'dimzjie_cart';

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function getCart() {
  const stored = window.localStorage.getItem(CART_KEY);
  return stored ? JSON.parse(stored) : [];
}

function calculateCartTotal(cart) {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCheckoutSummary() {
  const cart = getCart();

  if (!checkoutSummary) return;

  if (cart.length === 0) {
    checkoutSummary.innerHTML = '<p>Keranjang Anda kosong. Tambahkan produk terlebih dahulu.</p>';
    return;
  }

  const items = cart.map(item => `
    <div class="checkout-item">
      <div>
        <strong>${item.name}</strong>
        <p>Jumlah: ${item.quantity}</p>
      </div>
      <span>${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');

  const total = calculateCartTotal(cart);

  checkoutSummary.innerHTML = `
    <div class="checkout-items">${items}</div>
    <div class="checkout-total">
      <strong>Total yang harus dibayar</strong>
      <span>${formatPrice(total)}</span>
    </div>
    <div class="checkout-instructions">
      <p>Silakan transfer jumlah sama persis sebelum klik konfirmasi transfer.</p>
    </div>
  `;

  if (transferAmountLabel) {
    transferAmountLabel.textContent = formatPrice(total);
  }
}

function clearCart() {
  window.localStorage.removeItem(CART_KEY);
}

function handleCheckoutSubmit(event) {
  event.preventDefault();

  const cart = getCart();
  if (cart.length === 0) {
    alert('Keranjang kosong. Tambahkan produk sebelum checkout.');
    return;
  }

  if (!customerName.value || !customerEmail.value || !customerPhone.value || !customerAddress.value) {
    alert('Harap lengkapi semua data pengiriman terlebih dahulu.');
    return;
  }

  const confirmTransfer = document.getElementById('confirm-transfer');
  const transferAmountInput = transferAmountEl ? Number(transferAmountEl.value) : 0;
  const totalAmount = calculateCartTotal(cart);

  if (!confirmTransfer?.checked) {
    alert('Silakan konfirmasi bahwa Anda sudah transfer ke nomor DANA 082376890370.');
    return;
  }

  if (!transferAmountInput || transferAmountInput !== totalAmount) {
    alert(`Nominal transfer harus sama dengan total belanja: ${formatPrice(totalAmount)}.`);
    return;
  }

  const orderData = {
    name: customerName.value,
    email: customerEmail.value,
    phone: customerPhone.value,
    address: customerAddress.value,
    paymentMethod: 'DANA Transfer',
    total: calculateCartTotal(cart),
    cart,
    transferredTo: '082376890370',
    status: 'menunggu konfirmasi',
    createdAt: new Date().toISOString(),
  };

  fetch('/checkout-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.localStorage.setItem('dimzjie_last_order', JSON.stringify(orderData));
        clearCart();
        window.location.href = 'confirm.html';
      } else {
        alert('Gagal mengirim notifikasi checkout. Silakan coba lagi.');
      }
    })
    .catch(error => {
      console.error(error);
      alert('Terjadi kesalahan saat mengirim data checkout.');
    });
}

renderCheckoutSummary();
checkoutForm?.addEventListener('submit', handleCheckoutSubmit);

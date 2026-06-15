const checkoutSummary = document.getElementById('checkout-summary');
const checkoutForm = document.getElementById('checkout-form');
const customerName = document.getElementById('customer-name');
const customerEmail = document.getElementById('customer-email');
const customerPhone = document.getElementById('customer-phone');
const customerAddress = document.getElementById('customer-address');

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
      <p>Pilih metode pembayaran lalu klik "Bayar dan Konfirmasi". Setelah itu Anda akan menerima instruksi pembayaran.</p>
    </div>
  `;
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

  const paymentMethod = checkoutForm.querySelector('input[name="payment"]:checked').value;
  const total = calculateCartTotal(cart);

  const orderSummary = `
Pesanan berhasil dibuat!\n\nNama: ${customerName.value}
Email: ${customerEmail.value}
Telepon: ${customerPhone.value}
Alamat: ${customerAddress.value}
Metode Pembayaran: ${paymentMethod}
Total Pembayaran: ${formatPrice(total)}\n\nSilakan lanjutkan ke instruksi pembayaran berikut:
`;

  let paymentInstructions = '';
  switch (paymentMethod) {
    case 'Bank Transfer':
      paymentInstructions = `Bank Transfer ke:\n- BCA 123-456-7890 a.n. Dimzjie Outfit\n- Mandiri 987-654-3210 a.n. Dimzjie Outfit\n- BNI 112-233-4455 a.n. Dimzjie Outfit\n\nSetelah transfer, konfirmasi melalui chat atau email.`;
      break;
    case 'QRIS':
      paymentInstructions = `Bayar menggunakan QRIS melalui aplikasi dompet digital Anda. Scan kode QR yang muncul pada halaman konfirmasi.`;
      break;
    case 'E-Wallet':
      paymentInstructions = `Bayar melalui E-Wallet: OVO, Dana, atau ShopeePay. Pastikan nominal sama dengan total pembayaran.`;
      break;
    default:
      paymentInstructions = 'Pilih metode pembayaran yang tersedia.';
  }

  const orderData = {
    name: customerName.value,
    email: customerEmail.value,
    phone: customerPhone.value,
    address: customerAddress.value,
    paymentMethod,
    total,
    cart,
    paymentInstructions,
  };

  window.localStorage.setItem('dimzjie_last_order', JSON.stringify(orderData));
  clearCart();
  window.location.href = 'confirm.html';
}

renderCheckoutSummary();
checkoutForm?.addEventListener('submit', handleCheckoutSubmit);

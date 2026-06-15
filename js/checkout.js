const checkoutSummary = document.getElementById('checkout-summary');
const checkoutForm = document.getElementById('checkout-form');
const customerName = document.getElementById('customer-name');
const customerEmail = document.getElementById('customer-email');
const customerPhone = document.getElementById('customer-phone');
const customerAddress = document.getElementById('customer-address');
const transferAmountEl = document.getElementById('transfer-amount');
const transferAmountLabel = document.getElementById('transfer-amount-label');
const proofUpload = document.getElementById('proof-upload');
const danaButton = document.getElementById('open-dana-app');
const danaQrImage = document.getElementById('dana-qr');
const danaQrSourceInput = document.getElementById('dana-qr-source');
const generateDanaQrButton = document.getElementById('generate-dana-qr');

const CART_KEY = 'dimzjie_cart';
const DANA_ACCOUNT = '082376890370';
const DEFAULT_DANA_QR_IMAGE = 'images/dana-qr.jpg';
const DANA_QR_SOURCE_STORAGE = 'dimzjie_dana_qr_source';
const QR_GENERATOR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=';

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

function getStoredDanaQrSource() {
  return window.localStorage.getItem(DANA_QR_SOURCE_STORAGE) || '';
}

function saveStoredDanaQrSource(value) {
  if (value) {
    window.localStorage.setItem(DANA_QR_SOURCE_STORAGE, value);
  } else {
    window.localStorage.removeItem(DANA_QR_SOURCE_STORAGE);
  }
}

function getActiveDanaQrSource() {
  return getStoredDanaQrSource() || `DANA ${DANA_ACCOUNT}`;
}

function setDanaQrImageSource(src) {
  if (!danaQrImage) return;
  danaQrImage.src = src;
}

function getQrImageSource(value) {
  if (!value) {
    return DEFAULT_DANA_QR_IMAGE;
  }

  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${QR_GENERATOR_API}${encodeURIComponent(trimmed)}`;
}

function updateDanaQrImage() {
  const sourceValue = danaQrSourceInput?.value.trim();
  if (!danaQrImage) return;

  const imageSrc = getQrImageSource(sourceValue || `DANA ${DANA_ACCOUNT}`);
  setDanaQrImageSource(imageSrc);
  saveStoredDanaQrSource(sourceValue || '');
}

function loadSavedDanaQrSource() {
  const storedSource = getStoredDanaQrSource();
  if (danaQrSourceInput) {
    danaQrSourceInput.value = storedSource || `DANA ${DANA_ACCOUNT}`;
  }
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
      <div class="checkout-item-actions">
        <span>${formatPrice(item.price * item.quantity)}</span>
        <button class="btn btn-danger btn-small remove-checkout-item" type="button" data-id="${item.id}">Hapus</button>
      </div>
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
      <p>Silakan transfer jumlah yang sama persis ke akun DANA di bawah sebelum konfirmasi.</p>
    </div>
  `;

  checkoutSummary.querySelectorAll('.remove-checkout-item').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      removeFromCart(id);
    });
  });

  renderDanaPaymentInfo(total);
}

function removeFromCart(productId) {
  const cart = getCart();
  const newCart = cart.filter(item => item.id !== productId);
  window.localStorage.setItem(CART_KEY, JSON.stringify(newCart));
  renderCheckoutSummary();
}

function renderDanaPaymentInfo(total) {
  if (transferAmountLabel) {
    transferAmountLabel.textContent = formatPrice(total);
  }

  const danaUrl = 'https://m.dana.id/';
  if (danaButton) {
    danaButton.href = danaUrl;
    danaButton.textContent = `Buka DANA dan transfer ke ${DANA_ACCOUNT}`;
  }

  if (danaQrSourceInput) {
    danaQrSourceInput.value = getActiveDanaQrSource();
  }

  if (danaQrImage) {
    danaQrImage.src = getQrImageSource(getActiveDanaQrSource());
    danaQrImage.alt = `QR Code transfer DANA ke ${DANA_ACCOUNT} sejumlah ${formatPrice(total)}`;
  }
}

if (generateDanaQrButton) {
  generateDanaQrButton.addEventListener('click', updateDanaQrImage);
}

function getQrImageSource(value) {
  if (!value) {
    return DANA_QR_IMAGE;
  }

  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${QR_GENERATOR_API}${encodeURIComponent(trimmed)}`;
}

function updateDanaQrImage() {
  const sourceValue = danaQrSourceInput?.value?.trim();
  if (!danaQrImage) return;

  danaQrImage.src = getQrImageSource(sourceValue || `DANA ${DANA_ACCOUNT}`);
}

if (generateDanaQrButton) {
  generateDanaQrButton.addEventListener('click', updateDanaQrImage);
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

  if (!proofUpload?.files?.length) {
    alert('Unggah bukti transfer terlebih dahulu sebelum mengonfirmasi pesanan.');
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
    transferredTo: DANA_ACCOUNT,
    status: 'menunggu konfirmasi',
    createdAt: new Date().toISOString(),
  };

  const formData = new FormData();
  formData.append('name', orderData.name);
  formData.append('email', orderData.email);
  formData.append('phone', orderData.phone);
  formData.append('address', orderData.address);
  formData.append('paymentMethod', orderData.paymentMethod);
  formData.append('total', orderData.total);
  formData.append('cart', JSON.stringify(orderData.cart));
  formData.append('transferredTo', orderData.transferredTo);
  formData.append('status', orderData.status);
  formData.append('createdAt', orderData.createdAt);
  formData.append('transferAmount', transferAmountInput);
  if (proofUpload?.files?.[0]) {
    formData.append('proof', proofUpload.files[0]);
  }

  fetch('/checkout-notification', {
    method: 'POST',
    body: formData,
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

loadSavedDanaQr();
renderCheckoutSummary();
checkoutForm?.addEventListener('submit', handleCheckoutSubmit);
danaQrUpdateButton?.addEventListener('click', updateDanaQrFromInputs);

const checkoutSummary = document.getElementById('checkout-summary');
const checkoutForm = document.getElementById('checkout-form');
const customerName = document.getElementById('customer-name');
const customerEmail = document.getElementById('customer-email');
const customerPhone = document.getElementById('customer-phone');
const customerAddress = document.getElementById('customer-address');
const transferAmountEl = document.getElementById('transfer-amount');
const transferAmountLabel = document.getElementById('transfer-amount-label');
const proofUpload = document.getElementById('proof-upload');
const CART_KEY = 'dimzjie_cart';
const TRANSFER_ACCOUNT = '082376890370';

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
      <p>Silakan transfer jumlah yang sama persis sebelum konfirmasi.</p>
    </div>
  `;

  checkoutSummary.querySelectorAll('.remove-checkout-item').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      removeFromCart(id);
    });
  });

  renderPaymentInfo(total);
}

function removeFromCart(productId) {
  const cart = getCart();
  const newCart = cart.filter(item => item.id !== productId);
  window.localStorage.setItem(CART_KEY, JSON.stringify(newCart));
  renderCheckoutSummary();
}

function renderPaymentInfo(total) {
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
    alert('Silakan konfirmasi bahwa Anda sudah transfer dan mengunggah bukti transfer.');
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
    paymentMethod: 'Transfer',
    total: calculateCartTotal(cart),
    cart,
    transferredTo: TRANSFER_ACCOUNT,
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

renderCheckoutSummary();
checkoutForm?.addEventListener('submit', handleCheckoutSubmit);

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

function getOrderHistory() {
  const stored = window.localStorage.getItem('dimzjie_order_history');
  return stored ? JSON.parse(stored) : [];
}

function saveOrderHistory(history) {
  window.localStorage.setItem('dimzjie_order_history', JSON.stringify(history));
}

function pushOrderHistory(order) {
  const history = getOrderHistory();
  history.unshift(order);
  saveOrderHistory(history);
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

  if (transferAmountEl && !transferAmountEl.value) {
    transferAmountEl.value = total;
  }
}

function clearCart() {
  window.localStorage.removeItem(CART_KEY);
}

function parseCurrencyInput(value) {
  if (!value) return 0;
  let normalized = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/^Rp\.?/i, '')
    .replace(/,/g, '.')
    .replace(/\.\d{1,2}$/, '');
  normalized = normalized.replace(/[^0-9]/g, '');
  return normalized ? Number(normalized) : 0;
}

function completeCheckout(orderData) {
  window.localStorage.setItem('dimzjie_last_order', JSON.stringify(orderData));
  pushOrderHistory(orderData);
  clearCart();
  window.location.href = 'confirm.html';
}

// Pending notifications queue (stored in localStorage)
function getPendingNotifications() {
  const stored = window.localStorage.getItem('dimzjie_pending_notifications');
  return stored ? JSON.parse(stored) : [];
}

function savePendingNotifications(list) {
  window.localStorage.setItem('dimzjie_pending_notifications', JSON.stringify(list));
}

function enqueuePendingNotification(notification) {
  const list = getPendingNotifications();
  list.push(notification);
  savePendingNotifications(list);
}

function sendPendingNotifications() {
  const list = getPendingNotifications();
  if (!list || list.length === 0) return Promise.resolve();

  // try sending them sequentially
  return list.reduce((prev, item) => {
    return prev.then(() => {
      const fd = new FormData();
      fd.append('name', item.name);
      fd.append('email', item.email);
      fd.append('phone', item.phone);
      fd.append('address', item.address);
      fd.append('paymentMethod', item.paymentMethod);
      fd.append('total', item.total);
      fd.append('cart', JSON.stringify(item.cart));
      fd.append('transferredTo', item.transferredTo);
      fd.append('status', item.status);
      fd.append('createdAt', item.createdAt);
      fd.append('transferAmount', item.transferAmount || 0);

      return fetch('/checkout-notification', { method: 'POST', body: fd })
        .then(res => {
          if (!res.ok) throw new Error('server error');
          return res.json();
        })
        .then(data => {
          if (data && data.success) {
            // remove this item from pending
            const remaining = getPendingNotifications().filter(n => n.createdAt !== item.createdAt || n.total !== item.total);
            savePendingNotifications(remaining);
          } else {
            throw new Error('server rejected');
          }
        });
    });
  }, Promise.resolve()).catch(err => {
    console.warn('Some pending notifications could not be sent yet.', err);
  });
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
  const transferAmountInputRaw = transferAmountEl ? transferAmountEl.value : '';
  const transferAmountInput = parseCurrencyInput(transferAmountInputRaw);
  const totalAmount = calculateCartTotal(cart);

  if (!confirmTransfer?.checked) {
    alert('Silakan konfirmasi bahwa Anda sudah transfer dan mengunggah bukti transfer.');
    return;
  }

  if (!transferAmountInput || transferAmountInput < totalAmount) {
    alert(`Nominal transfer harus minimal sama dengan total belanja: ${formatPrice(totalAmount)}.`);
    return;
  }

  if (!proofUpload?.files?.length) {
    alert('Unggah bukti transfer terlebih dahulu sebelum mengonfirmasi pesanan.');
    return;
  }

  const orderData = {
    id: Date.now(),
    name: customerName.value,
    email: customerEmail.value,
    phone: customerPhone.value,
    address: customerAddress.value,
    paymentMethod: 'Transfer',
    total: calculateCartTotal(cart),
    cart,
    transferredTo: TRANSFER_ACCOUNT,
    transferAmount: transferAmountInput,
    proofName: proofUpload?.files?.[0]?.name || null,
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
    .then(async response => {
      if (!response.ok) {
        throw new Error('Server tidak merespon dengan benar.');
      }
      const data = await response.json();
      if (data.success) {
        completeCheckout(orderData);
      } else {
        throw new Error('Gagal mengirim notifikasi checkout.');
      }
    })
    .catch(error => {
      console.warn('Checkout notification gagal, menambahkan ke antrean pending dan menyelesaikan order secara lokal.', error);
      // enqueue the notification for later retry
      enqueuePendingNotification(orderData);
      completeCheckout(orderData);
    });
}

renderCheckoutSummary();
checkoutForm?.addEventListener('submit', handleCheckoutSubmit);

// attempt to send pending notifications on page load and periodically
sendPendingNotifications();
setInterval(() => {
  sendPendingNotifications();
}, 30 * 1000);

const checkoutSummary = document.getElementById('checkout-summary');
const checkoutForm = document.getElementById('checkout-form');
const customerName = document.getElementById('customer-name');
const customerEmail = document.getElementById('customer-email');
const customerPhone = document.getElementById('customer-phone');
const customerAddress = document.getElementById('customer-address');
const transferAmountEl = document.getElementById('transfer-amount');
const transferAmountLabel = document.getElementById('transfer-amount-label');
const proofUpload = document.getElementById('proof-upload');
const transferFields = document.getElementById('transfer-fields');
const stripeInfoBox = document.getElementById('stripe-fields');
const qrisPlaceholder = document.getElementById('qris-placeholder');
const ewalletPlaceholder = document.getElementById('ewallet-placeholder');
const paymentMethodNote = document.getElementById('payment-method-note');
const checkoutSubmitButton = checkoutForm?.querySelector('button[type="submit"]');
const CART_KEY = 'dimzjie_cart';
const TRANSFER_ACCOUNT = '082376890370';
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
  return 'http://localhost:3000';
})();

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function getSelectedPaymentMethod() {
  const selectedInput = document.querySelector('input[name="payment-method"]:checked');
  return selectedInput ? selectedInput.value : 'Transfer';
}

function updatePaymentMethodFields() {
  const method = getSelectedPaymentMethod();
  const isStripe = method === 'Stripe';

  if (transferFields) {
    transferFields.style.display = isStripe ? 'none' : 'block';
  }
  if (stripeInfoBox) {
    stripeInfoBox.style.display = isStripe ? 'block' : 'none';
  }

  if (paymentMethodNote) {
    if (method === 'Transfer') {
      paymentMethodNote.innerHTML = 'Transfer ke nomor <strong>082376890370</strong> sebelum menekan tombol konfirmasi.';
    } else if (method === 'QRIS') {
      paymentMethodNote.innerHTML = 'Bayar melalui QRIS dengan memindai kode QR yang tersedia di aplikasi dompet digital Anda.';
    } else if (method === 'E-Wallet') {
      paymentMethodNote.innerHTML = 'Bayar melalui OVO, DANA, atau ShopeePay. Unggah bukti pembayaran setelah transaksi selesai.';
    }
  }

  if (qrisPlaceholder) {
    qrisPlaceholder.style.display = method === 'QRIS' ? 'block' : 'none';
  }
  if (ewalletPlaceholder) {
    ewalletPlaceholder.style.display = method === 'E-Wallet' ? 'block' : 'none';
  }

  if (transferAmountEl) {
    transferAmountEl.required = !isStripe;
  }
  if (proofUpload) {
    proofUpload.required = !isStripe;
  }

  const confirmTransfer = document.getElementById('confirm-transfer');
  if (confirmTransfer) {
    confirmTransfer.required = !isStripe;
    if (isStripe) confirmTransfer.checked = false;
  }

  if (checkoutSubmitButton) {
    checkoutSubmitButton.textContent = isStripe ? 'Bayar Sekarang' : 'Konfirmasi Pesanan';
  }
}

const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
paymentMethodInputs.forEach(input => input.addEventListener('change', updatePaymentMethodFields));
updatePaymentMethodFields();

function safeParseJSON(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Gagal mengurai JSON dari localStorage:', error);
    return null;
  }
}

function getCart() {
  const stored = window.localStorage.getItem(CART_KEY);
  const parsed = safeParseJSON(stored);
  return Array.isArray(parsed) ? parsed : [];
}

function calculateCartTotal(cart) {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getOrderHistory() {
  const stored = window.localStorage.getItem('dimzjie_order_history');
  const parsed = safeParseJSON(stored);
  return Array.isArray(parsed) ? parsed : [];
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
    if (transferAmountLabel) transferAmountLabel.textContent = 'Rp0';
    if (transferAmountEl) transferAmountEl.value = '';
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
  const parsed = safeParseJSON(stored);
  return Array.isArray(parsed) ? parsed : [];
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

  const paymentMethod = getSelectedPaymentMethod();
  const confirmTransfer = document.getElementById('confirm-transfer');
  const transferAmountInputRaw = transferAmountEl ? transferAmountEl.value : '';
  const transferAmountInput = parseCurrencyInput(transferAmountInputRaw);
  const totalAmount = calculateCartTotal(cart);

  if (paymentMethod === 'Stripe') {
    const orderData = {
      id: Date.now(),
      name: customerName.value,
      email: customerEmail.value,
      phone: customerPhone.value,
      address: customerAddress.value,
      paymentMethod: 'Stripe',
      total: totalAmount,
      cart,
      transferredTo: null,
      transferAmount: totalAmount,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    };

    if (!orderData.name || !orderData.email || !orderData.phone || !orderData.address) {
      alert('Harap lengkapi semua data pengiriman terlebih dahulu.');
      return;
    }

    fetch(`${API_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: orderData.name,
        customerEmail: orderData.email,
        customerPhone: orderData.phone,
        customerAddress: orderData.address,
        cart: orderData.cart,
        total: orderData.total,
      }),
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Gagal membuat sesi pembayaran Stripe.');
        }
        window.localStorage.setItem('dimzjie_last_order', JSON.stringify(orderData));
        window.location.href = data.url;
      })
      .catch(error => {
        console.error('Stripe checkout error:', error);
        alert(`Gagal mengarahkan ke Stripe: ${error.message}`);
      });

    return;
  }

  if (!confirmTransfer?.checked) {
    alert('Silakan konfirmasi bahwa Anda sudah melakukan pembayaran dan mengunggah bukti pembayaran.');
    return;
  }

  if (!transferAmountInput || transferAmountInput < totalAmount) {
    alert(`Nominal pembayaran harus minimal sama dengan total belanja: ${formatPrice(totalAmount)}.`);
    return;
  }

  if (!proofUpload?.files?.length) {
    alert('Unggah bukti pembayaran terlebih dahulu sebelum mengonfirmasi pesanan.');
    return;
  }

  const orderData = {
    id: Date.now(),
    name: customerName.value,
    email: customerEmail.value,
    phone: customerPhone.value,
    address: customerAddress.value,
    paymentMethod,
    total: calculateCartTotal(cart),
    cart,
    transferredTo: paymentMethod === 'Transfer' ? TRANSFER_ACCOUNT : null,
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

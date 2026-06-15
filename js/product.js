const productNameEl = document.getElementById('product-name');
const productImageEl = document.getElementById('product-image');
const productDescriptionEl = document.getElementById('product-description');
const productFeaturesEl = document.getElementById('product-features');
const productPriceEl = document.getElementById('product-price');
const productCategoryEl = document.getElementById('product-category');
const addToCartButton = document.getElementById('add-to-cart');
const cartContentEl = document.getElementById('cart-content');

const CART_KEY = 'dimzjie_cart';
const PRODUCTS_LOCAL_KEY = 'dimzjie_local_products';

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function getCart() {
  const stored = window.localStorage.getItem(CART_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveCart(cart) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getLocalProducts() {
  const stored = window.localStorage.getItem(PRODUCTS_LOCAL_KEY);
  return stored ? JSON.parse(stored) : [];
}

function mergeProducts(products) {
  const base = Array.isArray(products) ? products : [];
  const local = getLocalProducts();
  return [...local, ...base];
}

function renderCart() {
  const cart = getCart();

  if (!cartContentEl) return;

  if (cart.length === 0) {
    cartContentEl.innerHTML = '<p>Keranjang kosong. Tambahkan produk untuk mulai belanja.</p>';
    return;
  }

  const items = cart.map(item => `
    <div class="cart-item">
      <div>
        <strong>${item.name}</strong>
        <p>Jumlah: ${item.quantity}</p>
      </div>
      <div class="cart-item-actions">
        <span>${formatPrice(item.price * item.quantity)}</span>
        <button class="btn btn-danger btn-small remove-cart-item" type="button" data-id="${item.id}">Hapus</button>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  cartContentEl.innerHTML = `
    <div class="cart-list">${items}</div>
    <div class="cart-total">
      <strong>Total:</strong>
      <span>${formatPrice(total)}</span>
    </div>
  `;

  cartContentEl.querySelectorAll('.remove-cart-item').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      removeFromCart(id);
    });
  });
}

function removeFromCart(productId) {
  const cart = getCart();
  const newCart = cart.filter(item => item.id !== productId);
  saveCart(newCart);
  renderCart();
}

function updateCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
  renderCart();
}

function getProductSlug() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('product') || 'atasan-santai';
}

function loadProduct() {
  const slug = getProductSlug();
  const API_BASE_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
    return 'http://localhost:3000';
  })();

  const DATA_PRODUCTS_URL = new URL('data/products.json', window.location.href).href;

  fetch(`${API_BASE_URL}/products`)
    .then(response => {
      if (!response.ok) throw new Error('Backend tidak tersedia');
      return response.json();
    })
    .catch(() => fetch(DATA_PRODUCTS_URL).then(response => response.json()))
    .then(products => mergeProducts(products))
    .then(products => {
      const product = Array.isArray(products)
        ? products.find(item => item.slug === slug) || products[0]
        : null;

      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      if (productNameEl) productNameEl.textContent = product.name || 'Produk Tidak Ditemukan';
      if (productImageEl) {
        productImageEl.src = product.image || '';
        productImageEl.alt = product.name || 'Detail produk';
      }
      if (productDescriptionEl) productDescriptionEl.textContent = product.description || '';
      if (productCategoryEl) productCategoryEl.textContent = product.category || '';
      if (productPriceEl) productPriceEl.textContent = formatPrice(product.price || 0);
      if (productFeaturesEl) {
        productFeaturesEl.innerHTML = (product.features || []).map(feature => `<li>${feature}</li>`).join('');
      }

      if (addToCartButton) {
        addToCartButton.disabled = false;
        addToCartButton.addEventListener('click', () => updateCart(product));
      }
    })
    .catch(() => {
      if (productNameEl) productNameEl.textContent = 'Produk tidak tersedia';
      if (productDescriptionEl) productDescriptionEl.textContent = 'Silakan kembali dan pilih produk lain.';
      if (addToCartButton) addToCartButton.disabled = true;
    });
}

loadProduct();
renderCart();

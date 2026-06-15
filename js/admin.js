const adminNotifications = document.getElementById('admin-notifications');
const addProductForm = document.getElementById('add-product-form');
const productNameInput = document.getElementById('product-name-input');
const productPriceInput = document.getElementById('product-price-input');
const productCategoryInput = document.getElementById('product-category-input');
const productSlugInput = document.getElementById('product-slug-input');
const productDescriptionInput = document.getElementById('product-description-input');
const productFeaturesInput = document.getElementById('product-features-input');
const productImageUrlInput = document.getElementById('product-image-url-input');
const productImageFileInput = document.getElementById('product-image-file-input');
const productFormMessage = document.getElementById('product-form-message');
const latestProductsEl = document.getElementById('latest-products');
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
  return 'http://localhost:3000';
})();
const DATA_PRODUCTS_URL = new URL('data/products.json', window.location.href).href;
const PRODUCTS_LOCAL_KEY = 'dimzjie_local_products';

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function displayProductFormMessage(message, type = 'success') {
  if (!productFormMessage) return;
  productFormMessage.textContent = message;
  productFormMessage.className = `product-form-message ${type}`;
}

function getLocalProducts() {
  const stored = window.localStorage.getItem(PRODUCTS_LOCAL_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalProducts(products) {
  window.localStorage.setItem(PRODUCTS_LOCAL_KEY, JSON.stringify(products));
}

function addLocalProduct(product) {
  const products = getLocalProducts();
  products.unshift(product);
  saveLocalProducts(products);
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function loadNotifications() {
  fetch(`${API_BASE_URL}/checkout-notifications`)
    .then(response => response.json())
    .then(data => renderNotifications(data))
    .catch(() => {
      if (adminNotifications) {
        adminNotifications.innerHTML = '<p>Gagal memuat notifikasi. Pastikan server Node dijalankan dengan <code>npm start</code> dan buka halaman lewat <strong>http://localhost:3000</strong>.</p>';
      }
    });
}

// initial load and periodic refresh so admin sees new orders
loadNotifications();
setInterval(loadNotifications, 10 * 1000);
function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function handleAddProductSubmit(event) {
  event.preventDefault();
  if (!addProductForm) return;

  const name = productNameInput.value.trim();
  const price = Number(productPriceInput.value);
  const category = productCategoryInput.value.trim();
  const slug = productSlugInput.value.trim() || createSlug(name);
  const description = productDescriptionInput.value.trim();
  const features = productFeaturesInput.value
    .split(',')
    .map(feature => feature.trim())
    .filter(Boolean);
  const imageUrl = productImageUrlInput.value.trim();
  const imageFile = productImageFileInput.files?.[0];

  if (!name || !price || price <= 0 || !category || !description) {
    displayProductFormMessage('Lengkapi semua data produk yang wajib diisi.', 'error');
    return;
  }

  if (!imageUrl && !imageFile) {
    displayProductFormMessage('Masukkan URL gambar atau unggah file gambar produk.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('price', price);
  formData.append('category', category);
  formData.append('slug', slug);
  formData.append('description', description);
  formData.append('features', JSON.stringify(features));
  formData.append('imageUrl', imageUrl);
  if (imageFile) {
    formData.append('imageFile', imageFile);
  }

  fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    body: formData,
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        displayProductFormMessage('Produk berhasil ditambahkan.', 'success');
        addProductForm.reset();
        loadLatestProducts();
      } else {
        throw new Error(data.error || 'Gagal menambahkan produk.');
      }
    })
    .catch(async () => {
      const fallbackImage = imageUrl || (imageFile ? await imageFileToDataUrl(imageFile) : '');
      if (!fallbackImage) {
        displayProductFormMessage('Backend tidak tersedia dan gambar tidak dapat disimpan secara lokal. Gunakan URL gambar atau jalankan server.', 'error');
        return;
      }
      const localProduct = {
        id: Date.now(),
        name,
        price,
        category,
        slug,
        description,
        features,
        image: fallbackImage,
      };
      addLocalProduct(localProduct);
      displayProductFormMessage('Produk berhasil ditambahkan secara lokal.', 'success');
      addProductForm.reset();
      loadLatestProducts();
    });
}

addProductForm?.addEventListener('submit', handleAddProductSubmit);

function loadLatestProducts(limit = 6) {
  if (!latestProductsEl) return;
  latestProductsEl.innerHTML = '<p>Memuat produk terbaru...</p>';
  fetch(`${API_BASE_URL}/products`)
    .then(response => {
      if (!response.ok) throw new Error('Backend tidak tersedia');
      return response.json();
    })
    .catch(() => fetch(DATA_PRODUCTS_URL).then(response => response.json()))
    .then(products => {
      const local = getLocalProducts();
      const merged = Array.isArray(products) ? [...local, ...products] : local;
      const sorted = Array.isArray(products) ? products.slice().sort((a, b) => b.id - a.id) : [];
      renderLatestProducts(sorted.slice(0, limit));
    })
    .catch(() => {
      latestProductsEl.innerHTML = '<p>Gagal memuat produk.</p>';
    });
}

function renderLatestProducts(items) {
  if (!latestProductsEl) return;
  if (!items || items.length === 0) {
    latestProductsEl.innerHTML = '<p>Tidak ada produk.</p>';
    return;
  }

  latestProductsEl.innerHTML = items.map(p => `
    <div class="latest-product-card">
      <img src="${p.image}" alt="${p.name}" />
      <div class="latest-product-info">
        <h4>${p.name}</h4>
        <p class="muted">${p.category}</p>
        <span class="price">${formatPrice(p.price)}</span>
        <a href="product.html?product=${p.slug}" class="btn btn-secondary">Lihat</a>
      </div>
    </div>
  `).join('');
}

// initial load
loadLatestProducts();

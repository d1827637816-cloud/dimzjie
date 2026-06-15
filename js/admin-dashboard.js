// Admin dashboard script: purchase history, tracking, add product
const purchaseHistoryEl = document.getElementById('purchase-history');
const dashboardTrackList = document.getElementById('dashboard-track-list');
const dashboardTrackSearch = document.getElementById('dashboard-track-search');
const dashboardOrderDetails = document.getElementById('dashboard-order-details');
const dashboardMapStatus = document.getElementById('dashboard-map-status');
const dashboardMapEl = document.getElementById('dashboard-map');
const adminProductList = document.getElementById('admin-product-list');
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
const productSearchInput = document.getElementById('product-search-input');
const productPageSizeSelect = document.getElementById('product-page-size');
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
  return 'http://localhost:3000';
})();
const productPrevBtn = document.getElementById('product-prev');
const productNextBtn = document.getElementById('product-next');
const productPageInfo = document.getElementById('product-page-info');
const adminLogoutButton = document.getElementById('admin-logout');

let productsCache = [];
let currentProductPage = 1;
let currentPageSize = Number(productPageSizeSelect?.value || 6);
let orders = [];
let selectedOrder = null;
let map;
let marker;
let editingProductId = null;

const SHIPMENT_STAGES = [
  'Menunggu Konfirmasi',
  'Dikemas',
  'Dikirim',
  'Dalam Perjalanan',
  'Tiba di Tujuan',
];

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function displayProductFormMessage(message, type = 'success') {
  if (!productFormMessage) return;
  productFormMessage.textContent = message;
  productFormMessage.className = `product-form-message ${type}`;
}

function renderPurchaseHistory(data) {
  if (!purchaseHistoryEl) return;

  if (!Array.isArray(data) || data.length === 0) {
    purchaseHistoryEl.innerHTML = '<p>Tidak ada riwayat pembelian saat ini.</p>';
    return;
  }

  purchaseHistoryEl.innerHTML = data.map(item => `
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
}

function loadPurchaseHistory() {
  fetch(`${API_BASE_URL}/checkout-notifications`)
    .then(resp => resp.json())
    .then(data => renderPurchaseHistory(data))
    .catch(() => {
      if (purchaseHistoryEl) purchaseHistoryEl.innerHTML = '<p>Gagal memuat riwayat pembelian. Pastikan server Node dijalankan dengan <code>npm start</code> dan buka halaman lewat <strong>http://localhost:3000</strong>.</p>';
    });
}

function getOrderLocationSample(orderId) {
  const locations = [
    { lat: -6.200000, lng: 106.816666 },
    { lat: -6.229386, lng: 106.689429 },
    { lat: -6.121435, lng: 106.774124 },
    { lat: -6.244256, lng: 106.806367 },
  ];
  return locations[orderId % locations.length];
}

function renderTrackList() {
  const searchTerm = dashboardTrackSearch?.value.trim().toLowerCase() || '';
  const filteredOrders = orders.filter(order =>
    (order.name || '').toLowerCase().includes(searchTerm) ||
    String(order.id).includes(searchTerm) ||
    (order.address || '').toLowerCase().includes(searchTerm)
  );

  if (!dashboardTrackList) return;
  if (filteredOrders.length === 0) {
    dashboardTrackList.innerHTML = '<p>Tidak ada pesanan yang cocok.</p>';
    return;
  }

  dashboardTrackList.innerHTML = filteredOrders.map(order => `
    <div class="track-card ${selectedOrder && selectedOrder.id === order.id ? 'selected' : ''}" data-id="${order.id}">
      <div class="track-card-header">
        <h4>${order.name}</h4>
        <span class="track-badge">${order.shipmentStage}</span>
      </div>
      <p><strong>ID:</strong> ${order.id}</p>
      <p><strong>Alamat:</strong> ${order.address}</p>
    </div>
  `).join('');

  document.querySelectorAll('#dashboard-track-list .track-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      selectedOrder = orders.find(o => o.id === id);
      renderOrderDetails();
      updateMap();
      renderTrackList();
    });
  });
}

function renderOrderDetails() {
  if (!dashboardOrderDetails || !selectedOrder) return;

  const location = selectedOrder.location || getOrderLocationSample(selectedOrder.id);
  const progressIndex = SHIPMENT_STAGES.indexOf(selectedOrder.shipmentStage);

  dashboardOrderDetails.innerHTML = `
    <div class="details-card">
      <h3>Detail Pesanan</h3>
      <p><strong>ID:</strong> ${selectedOrder.id}</p>
      <p><strong>Nama:</strong> ${selectedOrder.name}</p>
      <p><strong>Alamat:</strong> ${selectedOrder.address}</p>
      <p><strong>Total:</strong> ${formatPrice(selectedOrder.total)}</p>
      <p><strong>Status:</strong> ${selectedOrder.status}</p>

      <div class="shipment-progress-bar">
        ${SHIPMENT_STAGES.map((stage, index) => `
          <div class="progress-step ${index <= progressIndex ? 'active' : ''}">
            <span>${index + 1}</span>
            <p>${stage}</p>
          </div>
        `).join('')}
      </div>

      <div class="location-fields">
        <label>
          <strong>Latitude</strong>
          <input id="dashboard-location-lat" type="number" step="0.000001" value="${location.lat}" />
        </label>
        <label>
          <strong>Longitude</strong>
          <input id="dashboard-location-lng" type="number" step="0.000001" value="${location.lng}" />
        </label>
      </div>

      <label>
        <strong>Update Stage Pengiriman</strong>
        <select id="dashboard-shipment-stage-select">
          ${SHIPMENT_STAGES.map(stage => `<option value="${stage}">${stage}</option>`).join('')}
        </select>
      </label>
      <label>
        <strong>Update Status</strong>
        <input id="dashboard-shipment-status-input" type="text" value="${selectedOrder.status}" />
      </label>
      <button id="dashboard-save-shipment" class="btn btn-secondary">Simpan Pembaruan</button>
      <h4>Items</h4>
      <ul>${(selectedOrder.cart || []).map(item => `<li>${item.name} x ${item.quantity}</li>`).join('')}</ul>
    </div>
  `;

  const stageSelect = document.getElementById('dashboard-shipment-stage-select');
  const statusInput = document.getElementById('dashboard-shipment-status-input');
  const latInput = document.getElementById('dashboard-location-lat');
  const lngInput = document.getElementById('dashboard-location-lng');
  const saveButton = document.getElementById('dashboard-save-shipment');

  if (stageSelect) {
    stageSelect.value = selectedOrder.shipmentStage;
  }

  saveButton?.addEventListener('click', () => {
    const updatedStage = stageSelect?.value || selectedOrder.shipmentStage;
    const updatedStatus = statusInput?.value.trim() || selectedOrder.status;
    const updatedLat = Number(latInput?.value) || location.lat;
    const updatedLng = Number(lngInput?.value) || location.lng;
    updateOrderShipment(selectedOrder.id, updatedStage, updatedStatus, { lat: updatedLat, lng: updatedLng });
  });
}

function initMap() {
  if (!dashboardMapEl || !window.google || !window.google.maps) return;

  map = new google.maps.Map(dashboardMapEl, {
    center: { lat: -6.200000, lng: 106.816666 },
    zoom: 12,
  });

  marker = new google.maps.Marker({
    map,
    position: { lat: -6.200000, lng: 106.816666 },
  });
}

function updateMap() {
  if (!map || !marker || !selectedOrder) return;

  const position = selectedOrder.location || getOrderLocationSample(selectedOrder.id);
  map.setCenter(position);
  marker.setPosition(position);
  if (dashboardMapStatus) {
    dashboardMapStatus.textContent = `Lokasi terakhir: ${selectedOrder.address} (Stage: ${selectedOrder.shipmentStage})`;
  }
}

function fetchConfig() {
  return fetch(`${API_BASE_URL}/config`)
    .then(response => response.json())
    .catch(() => ({ googleMapsApiKey: '' }));
}

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function updateOrderShipment(id, stage, status, location) {
  try {
    const body = { shipmentStage: stage, status };
    if (location) body.location = location;

    const response = await fetch(`/checkout-notification/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.success) {
      const index = orders.findIndex(order => order.id === id);
      if (index !== -1) {
        orders[index] = data.order;
        selectedOrder = data.order;
        renderOrderDetails();
        renderTrackList();
        updateMap();
      }
    } else {
      alert(data.error || 'Gagal memperbarui status pengiriman.');
    }
  } catch (err) {
    alert('Terjadi kesalahan saat menyimpan pembaruan pengiriman.');
  }
}

function loadOrders() {
  fetch(`${API_BASE_URL}/checkout-notifications`)
    .then(response => response.json())
    .then(data => {
      orders = (Array.isArray(data) ? data : []).map(item => ({
        ...item,
        shipmentStage: item.shipmentStage || 'Menunggu Konfirmasi',
        location: item.location || getOrderLocationSample(item.id),
      }));
      renderTrackList();
    })
    .catch(() => {
      if (dashboardTrackList) dashboardTrackList.innerHTML = '<p>Gagal memuat pesanan. Pastikan server Node dijalankan dengan <code>npm start</code> dan buka halaman lewat <strong>http://localhost:3000</strong>.</p>';
    });
}

function renderProductPage() {
  if (!adminProductList) return;

  const search = (productSearchInput?.value || '').trim().toLowerCase();
  let filtered = productsCache.slice();
  if (search) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(search) ||
      (p.category || '').toLowerCase().includes(search) ||
      (p.slug || '').toLowerCase().includes(search)
    );
  }

  currentPageSize = Number(productPageSizeSelect?.value || currentPageSize || 6);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  if (currentProductPage > totalPages) currentProductPage = totalPages;

  const start = (currentProductPage - 1) * currentPageSize;
  const pageItems = filtered.slice().reverse().slice(start, start + currentPageSize);

  if (!pageItems || pageItems.length === 0) {
    adminProductList.innerHTML = '<p>Tidak ada produk.</p>';
    if (productPageInfo) productPageInfo.textContent = `Halaman ${currentProductPage} / ${totalPages}`;
    return;
  }

  adminProductList.innerHTML = pageItems.map(p => `
    <div class="latest-product-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" />
      <div class="latest-product-info">
        <h4>${p.name}</h4>
        <p class="muted">${p.category}</p>
        <span class="price">${formatPrice(p.price)}</span>
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
          <button class="btn btn-secondary btn-edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-danger btn-delete" data-id="${p.id}">Hapus</button>
        </div>
      </div>
    </div>
  `).join('');

  adminProductList.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => {
    const id = Number(btn.dataset.id);
    startEditProduct(id);
  }));
  adminProductList.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => {
    const id = Number(btn.dataset.id);
    if (!confirm('Hapus produk ini?')) return;
    fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          loadProductList();
          loadPurchaseHistory();
          loadOrders();
        } else {
          alert(data.error || 'Gagal menghapus produk.');
        }
      })
      .catch(() => { alert('Terjadi kesalahan saat menghapus produk.'); });
  }));

  if (productPageInfo) productPageInfo.textContent = `Halaman ${currentProductPage} / ${totalPages}`;
  if (productPrevBtn) productPrevBtn.disabled = currentProductPage <= 1;
  if (productNextBtn) productNextBtn.disabled = currentProductPage >= totalPages;
}

function loadProductList() {
  if (!adminProductList) return;
  fetch(`${API_BASE_URL}/products`)
    .then(response => {
      if (!response.ok) throw new Error('Backend tidak tersedia');
      return response.json();
    })
    .catch(() => fetch('data/products.json').then(response => response.json()))
    .then(products => {
      productsCache = Array.isArray(products) ? products : [];
      currentProductPage = 1;
      renderProductPage();
    })
    .catch(() => {
      if (adminProductList) adminProductList.innerHTML = '<p>Gagal memuat produk.</p>';
    });
}

function resetProductForm() {
  editingProductId = null;
  addProductForm?.reset();
  const submitBtn = addProductForm?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Tambah Produk';
  const cancelBtn = document.getElementById('cancel-edit-btn');
  cancelBtn?.remove();
}

function startEditProduct(id) {
  fetch('/products')
    .then(r => r.json())
    .then(products => {
      const p = (Array.isArray(products) ? products : []).find(x => x.id === id);
      if (!p) {
        alert('Produk tidak ditemukan.');
        return;
      }
      editingProductId = id;
      productNameInput.value = p.name || '';
      productPriceInput.value = p.price || '';
      productCategoryInput.value = p.category || '';
      productSlugInput.value = p.slug || '';
      productDescriptionInput.value = p.description || '';
      productFeaturesInput.value = (p.features || []).join(', ');
      productImageUrlInput.value = p.image || '';
      const submitBtn = addProductForm?.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Simpan Perubahan';
      if (!document.getElementById('cancel-edit-btn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Batal';
        cancelBtn.style.marginLeft = '0.5rem';
        cancelBtn.addEventListener('click', resetProductForm);
        submitBtn?.parentNode?.appendChild(cancelBtn);
      }
      window.scrollTo({ top: addProductForm.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    })
    .catch(() => { alert('Gagal memuat produk untuk diedit.'); });
}

function handleAddProductSubmit(event) {
  event.preventDefault();
  if (!addProductForm) return;

  const name = productNameInput.value.trim();
  const price = Number(productPriceInput.value);
  const category = productCategoryInput.value.trim();
  const slug = productSlugInput.value.trim() || createSlug(name);
  const description = productDescriptionInput.value.trim();
  const features = productFeaturesInput.value.split(',').map(f => f.trim()).filter(Boolean);
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
  if (imageFile) formData.append('imageFile', imageFile);

  const method = editingProductId ? 'PUT' : 'POST';
  const url = editingProductId ? `/products/${editingProductId}` : '/products';

  fetch(`${API_BASE_URL}${url}`, { method, body: formData })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        displayProductFormMessage(editingProductId ? 'Perubahan produk tersimpan.' : 'Produk berhasil ditambahkan.', 'success');
        resetProductForm();
        loadProductList();
        loadPurchaseHistory();
        loadOrders();
      } else {
        displayProductFormMessage(data.error || 'Gagal menyimpan produk.', 'error');
      }
    })
    .catch(() => {
      displayProductFormMessage('Terjadi kesalahan saat mengirim data produk.', 'error');
    });
}

function loadProductList() {
  fetch('/products')
    .then(r => r.json())
    .then(products => {
      productsCache = Array.isArray(products) ? products : [];
      currentProductPage = 1;
      renderProductPage();
    })
    .catch(() => {
      if (adminProductList) adminProductList.innerHTML = '<p>Gagal memuat produk.</p>';
    });
}

async function initializeDashboard() {
  loadPurchaseHistory();
  loadProductList();
  loadOrders();

  dashboardTrackSearch?.addEventListener('input', renderTrackList);
  productSearchInput?.addEventListener('input', () => { currentProductPage = 1; renderProductPage(); });
  productPageSizeSelect?.addEventListener('change', () => { currentProductPage = 1; renderProductPage(); });
  productPrevBtn?.addEventListener('click', () => { if (currentProductPage > 1) { currentProductPage--; renderProductPage(); } });
  productNextBtn?.addEventListener('click', () => { currentProductPage++; renderProductPage(); });
  addProductForm?.addEventListener('submit', handleAddProductSubmit);
  adminLogoutButton?.addEventListener('click', () => {
    window.localStorage.removeItem('dimzjie_admin_authenticated');
    window.location.href = 'admin-login.html';
  });

  const config = await fetchConfig();
  if (!config.googleMapsApiKey) {
    if (dashboardMapStatus) dashboardMapStatus.textContent = 'Google Maps API key tidak ditemukan.';
    return;
  }

  try {
    await loadGoogleMaps(config.googleMapsApiKey);
    initMap();
  } catch {
    if (dashboardMapStatus) dashboardMapStatus.textContent = 'Gagal memuat Google Maps.';
  }
}

window.addEventListener('load', initializeDashboard);

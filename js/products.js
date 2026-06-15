const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('product-search');
const filterButtons = document.querySelectorAll('.filter-btn');
const noResults = document.getElementById('no-results');

let allProducts = [];
let activeFilter = 'all';
let searchTerm = '';

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function loadAllProducts() {
  const API_BASE_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
    return 'http://localhost:3000';
  })();

  fetch(`${API_BASE_URL}/products`)
    .then(response => response.json())
    .then(products => {
      allProducts = Array.isArray(products) ? products : [];
      renderProducts();
    })
    .catch(() => {
      productGrid.innerHTML = `
        <article class="product-card">
          <h3>Gagal memuat produk</h3>
          <p>Silakan refresh halaman atau coba lagi nanti.</p>
        </article>
      `;
    });
}

function filterProducts() {
  let filtered = allProducts;

  // Filter berdasarkan kategori
  if (activeFilter !== 'all') {
    filtered = filtered.filter(product => product.category === activeFilter);
  }

  // Filter berdasarkan pencarian
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  }

  return filtered;
}

function renderProducts() {
  const filteredProducts = filterProducts();

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = '';
    productGrid.style.display = 'none';
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
    productGrid.style.display = 'grid';
    productGrid.innerHTML = filteredProducts.map(product => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" class="product-image" />
        <h3>${product.name}</h3>
        <p class="product-category">${product.category}</p>
        <p class="product-description">${product.description}</p>
        <span class="price">${formatPrice(product.price)}</span>
        <a href="product.html?product=${product.slug}" class="btn btn-secondary">Lihat Detail</a>
      </article>
    `).join('');
  }
}

// Event listeners untuk filter
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderProducts();
  });
});

// Event listener untuk search
searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderProducts();
});

// Load produk saat halaman dibuka
loadAllProducts();

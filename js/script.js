const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');
const productGrid = document.getElementById('product-grid');
const API_BASE_URL = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
  return 'http://localhost:3000';
})();

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    mainNav.classList.toggle('active');
  });
}

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function loadHomepageProducts() {
  if (!productGrid) return;

  fetch(`${API_BASE_URL}/products`)
    .then(response => response.json())
    .then(products => {
      const recommendedProducts = Array.isArray(products) ? products.slice(0, 3) : [];
      productGrid.innerHTML = recommendedProducts.map(product => `
        <article class="product-card">
          <img src="${product.image}" alt="${product.name}" class="product-image" />
          <h3>${product.name}</h3>
          <p class="product-category">${product.category}</p>
          <p class="product-description">${product.description}</p>
          <span class="price">${formatPrice(product.price)}</span>
          <a href="product.html?product=${product.slug}" class="btn btn-secondary">Lihat Detail</a>
        </article>
      `).join('');
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

loadHomepageProducts();

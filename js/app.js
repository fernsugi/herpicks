/* HerPicks.co — Main Application JavaScript */

(function () {
  'use strict';

  // ─── State ───
  let allProducts = [];
  let filteredProducts = [];
  let currentCategory = 'all';
  let currentSort = 'featured';
  let displayCount = 12;
  const PRODUCTS_PER_PAGE = 12;

  // ─── DOM Ready ───
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await loadProducts();
    setupHeader();
    setupSearch();
    setupMobileNav();
    setupBackToTop();
    renderPage();
  }

  // ─── Load Products ───
  async function loadProducts() {
    try {
      // Try relative paths for GitHub Pages compatibility
      const paths = ['data/products.json', '/data/products.json', '../data/products.json'];
      let data = null;
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) { data = await res.json(); break; }
        } catch (e) { continue; }
      }
      if (!data) throw new Error('Could not load products');
      allProducts = data.products || data;
      filteredProducts = [...allProducts];
    } catch (e) {
      console.error('Failed to load products:', e);
      allProducts = [];
      filteredProducts = [];
    }
  }

  // ─── Render Page (auto-detect) ───
  function renderPage() {
    const grid = document.getElementById('products-grid');
    const featuredGrid = document.getElementById('featured-grid');
    const productDetail = document.getElementById('product-detail');

    if (productDetail) renderProductDetail();
    if (featuredGrid) renderFeatured(featuredGrid);
    if (grid) {
      setupFilters();
      setupSort();
      applyFiltersAndRender();
    }
  }

  // ─── Render Product Cards ───
  function renderProducts(container, products, limit) {
    const items = limit ? products.slice(0, limit) : products;
    container.innerHTML = items.map(p => productCardHTML(p)).join('');
    // Animate
    container.querySelectorAll('.product-card').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.05}s`;
      el.classList.add('animate-in');
    });
    // Update count
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `Showing ${items.length} of ${products.length} products`;
    // Load more button
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = items.length < products.length ? 'inline-flex' : 'none';
    }
  }

  function renderFeatured(container) {
    const featured = allProducts.filter(p => p.badge === 'bestseller' || p.rating >= 4.5).slice(0, 4);
    renderProducts(container, featured);
  }

  // ─── Product Card HTML ───
  function productCardHTML(p) {
    const stars = renderStars(p.rating);
    const badge = p.badge ? `<span class="badge ${p.badge}">${p.badge}</span>` : '';
    const originalPrice = p.originalPrice ? `<span class="price-original">$${p.originalPrice.toFixed(2)}</span>` : '';
    const detailUrl = getProductDetailUrl(p.id);
    return `
      <div class="product-card">
        ${badge}
        <a href="${detailUrl}" class="product-image">
          <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='https://placehold.co/400x400/F2E0D9/C4727F?text=HerPicks'">
        </a>
        <div class="product-info">
          <div class="product-category-label">${escapeHtml(p.category)}</div>
          <h3><a href="${detailUrl}">${escapeHtml(p.title)}</a></h3>
          <div class="product-rating">
            <div class="stars">${stars}</div>
            <span class="review-count">(${p.reviewCount?.toLocaleString() || 0})</span>
          </div>
          <div class="product-price">
            <span class="price-current">$${p.price.toFixed(2)}</span>
            ${originalPrice}
          </div>
          <a href="${p.affiliateUrl}" target="_blank" rel="noopener noreferrer nofollow" class="btn-shop">
            Shop on Amazon
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
          </a>
        </div>
      </div>`;
  }

  function getProductDetailUrl(id) {
    const isSubpage = window.location.pathname.includes('/categories/');
    const prefix = isSubpage ? '../' : '';
    return `${prefix}product.html?id=${id}`;
  }

  function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += i <= Math.round(rating) ? '★' : '<span class="empty">★</span>';
    }
    return html;
  }

  // ─── Filters & Sort ───
  function setupFilters() {
    document.querySelectorAll('.filter-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category || 'all';
        displayCount = PRODUCTS_PER_PAGE;
        applyFiltersAndRender();
      });
    });
  }

  function setupSort() {
    const sortEl = document.getElementById('sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', () => {
        currentSort = sortEl.value;
        applyFiltersAndRender();
      });
    }
    // Load more
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        displayCount += PRODUCTS_PER_PAGE;
        const grid = document.getElementById('products-grid');
        if (grid) renderProducts(grid, filteredProducts, displayCount);
      });
    }
  }

  function applyFiltersAndRender() {
    // Filter
    if (currentCategory === 'all') {
      filteredProducts = [...allProducts];
    } else {
      filteredProducts = allProducts.filter(p =>
        p.category.toLowerCase() === currentCategory.toLowerCase()
      );
    }
    // Also check URL for category page
    const pageCategory = document.body.dataset.category;
    if (pageCategory && pageCategory !== 'all') {
      filteredProducts = allProducts.filter(p =>
        p.category.toLowerCase() === pageCategory.toLowerCase()
      );
      if (currentCategory !== 'all') {
        filteredProducts = filteredProducts.filter(p =>
          p.subcategory?.toLowerCase() === currentCategory.toLowerCase()
        );
      }
    }
    // Sort
    switch (currentSort) {
      case 'price-low': filteredProducts.sort((a, b) => a.price - b.price); break;
      case 'price-high': filteredProducts.sort((a, b) => b.price - a.price); break;
      case 'rating': filteredProducts.sort((a, b) => b.rating - a.rating); break;
      case 'reviews': filteredProducts.sort((a, b) => b.reviewCount - a.reviewCount); break;
      case 'newest': filteredProducts.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')); break;
      default: filteredProducts.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
    }
    const grid = document.getElementById('products-grid');
    if (grid) renderProducts(grid, filteredProducts, displayCount);
  }

  // ─── Product Detail ───
  function renderProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = allProducts.find(p => p.id == id);
    const container = document.getElementById('product-detail');
    if (!product || !container) {
      if (container) container.innerHTML = '<p style="text-align:center;padding:60px;">Product not found.</p>';
      return;
    }
    document.title = `${product.title} — HerPicks`;
    const stars = renderStars(product.rating);
    const originalPrice = product.originalPrice ? `<span class="price-original">$${product.originalPrice.toFixed(2)}</span>` : '';
    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="index.html">Home</a> <span>›</span>
          <a href="categories/${product.category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}.html">${escapeHtml(product.category)}</a>
          <span>›</span> <span>${escapeHtml(product.title.substring(0, 40))}...</span>
        </div>
        <div class="product-detail-grid">
          <div class="product-gallery">
            <div class="product-main-image">
              <img src="${product.image}" alt="${escapeHtml(product.title)}" onerror="this.src='https://placehold.co/600x600/F2E0D9/C4727F?text=HerPicks'">
            </div>
          </div>
          <div class="product-detail-info">
            <div class="product-category-label">${escapeHtml(product.category)}</div>
            <h1>${escapeHtml(product.title)}</h1>
            <div class="product-rating">
              <div class="stars">${stars}</div>
              <span class="review-count">${product.reviewCount?.toLocaleString() || 0} reviews</span>
            </div>
            <div class="product-price">
              <span class="price-current">$${product.price.toFixed(2)}</span>
              ${originalPrice}
            </div>
            <div class="product-description">${escapeHtml(product.description)}</div>
            <a href="${product.affiliateUrl}" target="_blank" rel="noopener noreferrer nofollow" class="btn-shop">
              Shop on Amazon
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
            </a>
          </div>
        </div>
      </div>`;

    // Add structured data
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title,
      "description": product.description,
      "image": product.image,
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": product.affiliateUrl
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviewCount
      }
    };
    const scriptEl = document.createElement('script');
    scriptEl.type = 'application/ld+json';
    scriptEl.textContent = JSON.stringify(schema);
    document.head.appendChild(scriptEl);
  }

  // ─── Header Scroll ───
  function setupHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // ─── Search ───
  function setupSearch() {
    const toggle = document.querySelector('.search-toggle');
    const overlay = document.querySelector('.search-overlay');
    const close = document.querySelector('.search-close');
    const input = document.querySelector('.search-overlay input');
    const results = document.querySelector('.search-results');
    if (!toggle || !overlay) return;

    toggle.addEventListener('click', () => {
      overlay.classList.add('active');
      setTimeout(() => input?.focus(), 200);
    });

    close?.addEventListener('click', () => overlay.classList.remove('active'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') overlay.classList.remove('active');
    });

    input?.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q || q.length < 2) { results.innerHTML = ''; return; }
      const matches = allProducts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      ).slice(0, 8);
      results.innerHTML = matches.map(p => `
        <a href="${getProductDetailUrl(p.id)}" class="search-result-item">
          <img src="${p.image}" alt="" onerror="this.src='https://placehold.co/56x56/F2E0D9/C4727F?text=HP'">
          <div class="result-info">
            <h4>${escapeHtml(p.title)}</h4>
            <span class="result-price">$${p.price.toFixed(2)}</span>
          </div>
        </a>
      `).join('');
    });
  }

  // ─── Mobile Nav ───
  function setupMobileNav() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.mobile-nav');
    const backdrop = document.querySelector('.mobile-nav-backdrop');
    const closeBtn = document.querySelector('.close-mobile');
    if (!toggle || !nav) return;

    const open = () => { nav.classList.add('active'); backdrop?.classList.add('active'); document.body.style.overflow = 'hidden'; };
    const close = () => { nav.classList.remove('active'); backdrop?.classList.remove('active'); document.body.style.overflow = ''; };

    toggle.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
  }

  // ─── Back to Top ───
  function setupBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ─── Utility ───
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Expose for external use
  window.HerPicks = { allProducts, filteredProducts, applyFiltersAndRender };
})();

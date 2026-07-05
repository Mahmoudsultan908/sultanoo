/**
 * Sultan Foods — Category Page
 */

const CategoryPage = (() => {
  let currentCatId = null;
  let currentSubId = null;
  let allProducts = [];
  let subcategories = [];

  const render = async ({ id, name } = {}) => {
    if (!id) return;
    currentCatId = id;
    currentSubId = null;

    // Update header
    const titleEl = document.getElementById('cat-page-title');
    if (titleEl) titleEl.textContent = name || '';

    // Reset
    document.getElementById('cat-subcats').innerHTML = '';
    document.getElementById('cat-products').innerHTML = renderSkeletons(6);

    try {
      [subcategories, allProducts] = await Promise.all([
        API.getSubcategories(id),
        API.getProductsByCategory(id),
      ]);
      renderSubcategories();
      renderProducts(allProducts);
    } catch (e) {
      console.error('[Category] error:', e);
      const el = document.getElementById('cat-products');
      if (el) el.innerHTML = `
        <div style="text-align:center;padding:2.5rem;grid-column:1/-1">
          <div style="font-size:2.5rem;margin-bottom:.5rem">⚠️</div>
          <p style="color:var(--gray-500);margin:.25rem 0 1rem">تعذّر تحميل المنتجات</p>
          <button class="btn btn-primary" onclick="CategoryPage.reload()" style="padding:.5rem 1.5rem">🔄 إعادة المحاولة</button>
        </div>`;
    }
  };

  const renderSkeletons = (n) =>
    `<div class="loading-grid">${Array(n).fill('<div class="skeleton skeleton-card"></div>').join('')}</div>`;

  const renderSubcategories = () => {
    const el = document.getElementById('cat-subcats');
    if (!el) return;
    if (!subcategories.length) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = `
      <button class="subcat-tab active" onclick="CategoryPage.filterSub(null, this)">الكل</button>
      ${subcategories.map(s => `
        <button class="subcat-tab" onclick="CategoryPage.filterSub('${s.id}', this)">${s.name_ar}</button>
      `).join('')}
    `;
  };

  const filterSub = (subId, btn) => {
    currentSubId = subId;
    document.querySelectorAll('#cat-subcats .subcat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = subId
      ? allProducts.filter(p => p.subcategory_id === subId)
      : allProducts;
    renderProducts(filtered);
  };

  const renderProducts = (products) => {
    const el = document.getElementById('cat-products');
    if (!el) return;
    if (!products.length) {
      el.innerHTML = `<div class="empty-state">
        <span class="empty-icon">📦</span>
        <h3>لا توجد منتجات</h3>
        <p>لا توجد منتجات في هذا القسم حالياً</p>
      </div>`;
      return;
    }
    el.innerHTML = `<div class="products-grid">${products.map(p => renderProductCard(p)).join('')}</div>`;
  };

  const reload = () => render({ id: currentCatId });

  return { render, filterSub, reload };
})();

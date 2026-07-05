/**
 * Sultan Foods — Favorites Page
 */

const FavoritesPage = (() => {
  const render = async () => {
    await loadFavorites();
  };

  const loadFavorites = async () => {
    const listEl = document.getElementById('fav-list');
    const countEl = document.getElementById('fav-count');
    if (!listEl) return;

    const ids = Favorites.getIds();
    if (!ids.length) {
      if (countEl) countEl.textContent = '';
      listEl.innerHTML = `<div class="empty-state">
        <span class="empty-icon">❤️</span>
        <h3>لا توجد مفضلة بعد</h3>
        <p>اضغط على ❤️ على أي منتج لإضافته للمفضلة</p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('home')">تصفح المنتجات</button>
      </div>`;
      return;
    }

    listEl.innerHTML = `<div class="loading-grid">${Array(Math.min(ids.length, 4)).fill('<div class="skeleton skeleton-card"></div>').join('')}</div>`;

    try {
      const all = await API.getProducts();
      const favProducts = all.filter(p => ids.includes(p.id));

      if (countEl) countEl.textContent = `${favProducts.length} منتج في المفضلة`;

      if (!favProducts.length) {
        listEl.innerHTML = `<div class="empty-state">
          <span class="empty-icon">❤️</span>
          <h3>لا توجد منتجات</h3>
        </div>`;
        return;
      }

      listEl.innerHTML = `<div class="products-grid">${favProducts.map(p => renderProductCard(p)).join('')}</div>`;
    } catch (e) {
      showToast('⚠️ خطأ في تحميل المفضلة');
    }
  };

  // إعادة تحميل عند تغيير المفضلة
  Favorites.onChange(() => {
    if (Router.getCurrentPage() === 'favorites') loadFavorites();
  });

  return { render };
})();

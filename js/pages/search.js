/**
 * Sultan Foods — Search Page
 */

const SearchPage = (() => {
  let timer = null;

  const render = ({ query, featured } = {}) => {
    const input = document.getElementById('search-input');
    if (featured) {
      if (input) input.value = '';
      loadFeatured();
      return;
    }
    if (input && query) {
      input.value = query;
      doSearch(query);
    } else if (input) {
      input.focus();
    }
  };

  const loadFeatured = async () => {
    const resultsEl = document.getElementById('search-results');
    const countEl   = document.getElementById('search-count');
    if (!resultsEl) return;
    resultsEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--gray-400)">⏳ جاري التحميل...</div>`;
    try {
      const products = await API.getFeatured();
      if (countEl) countEl.textContent = `${products.length} منتج في العروض`;
      resultsEl.innerHTML = products.length
        ? `<div class="products-grid">${products.map(p => renderProductCard(p)).join('')}</div>`
        : `<div class="empty-state"><span class="empty-icon">🏷️</span><p>لا توجد عروض حالياً</p></div>`;
      // تفعيل الصور الكسولة
      try {
        resultsEl.querySelectorAll('img[data-src]').forEach(img => lazyLoader.observe(img));
      } catch {}
    } catch (e) {
      console.error('[Search/Featured]', e);
      resultsEl.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span>
        <p>تعذّر تحميل العروض</p>
        <button class="btn btn-primary btn-sm" onclick="SearchPage.reloadFeatured()" style="margin-top:.75rem">🔄 إعادة المحاولة</button>
      </div>`;
    }
  };

  const init = () => {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearBtn.style.display = q ? 'block' : 'none';
      clearTimeout(timer);
      if (q.length >= 2) {
        timer = setTimeout(() => doSearch(q), CONFIG.UI.SEARCH_DEBOUNCE);
      } else {
        showEmpty();
      }
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      showEmpty();
      input.focus();
    });
  };

  const doSearch = async (query) => {
    const resultsEl = document.getElementById('search-results');
    const headerEl = document.getElementById('search-results-header');
    if (!resultsEl) return;

    resultsEl.innerHTML = `<div class="loading-grid">${Array(4).fill('<div class="skeleton skeleton-card"></div>').join('')}</div>`;

    try {
      const products = await API.searchProducts(query);
      if (headerEl) headerEl.textContent = products.length
        ? `${products.length} نتيجة لـ "${query}"`
        : '';

      if (!products.length) {
        resultsEl.innerHTML = `<div class="empty-state">
          <span class="empty-icon">🔍</span>
          <h3>لا نتائج</h3>
          <p>لم نجد منتجات تطابق "${query}"</p>
        </div>`;
        return;
      }
      resultsEl.innerHTML = `<div class="products-grid">${products.map(p => renderProductCard(p)).join('')}</div>`;
    } catch (e) {
      resultsEl.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><h3>خطأ في البحث</h3></div>`;
    }
  };

  const showEmpty = () => {
    const resultsEl = document.getElementById('search-results');
    const headerEl = document.getElementById('search-results-header');
    if (resultsEl) resultsEl.innerHTML = '';
    if (headerEl) headerEl.textContent = '';
  };

  const reloadFeatured = () => loadFeatured();

  return { render, init, reloadFeatured };
})();

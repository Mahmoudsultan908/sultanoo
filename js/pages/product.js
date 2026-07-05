/**
 * Sultan Foods — Product Detail Page
 */

const ProductPage = (() => {

  const render = async ({ id } = {}) => {
    const titleEl   = document.getElementById('product-page-title');
    const contentEl = document.getElementById('product-page-content');
    if (!contentEl) return;

    if (!id) {
      contentEl.innerHTML = `<div class="empty-state"><span class="empty-icon">❌</span><h3>المنتج غير موجود</h3></div>`;
      return;
    }

    // Loading state
    contentEl.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--gray-400)">⏳ جاري التحميل...</div>`;

    try {
      const product = await API.getProductById(id);

      if (!product) {
        contentEl.innerHTML = `<div class="empty-state"><span class="empty-icon">❌</span><h3>المنتج غير موجود</h3></div>`;
        return;
      }

      if (titleEl) titleEl.textContent = product.name_ar;

      // تخزين في الكاش للـ refreshProductCards
      if (window._productCache) window._productCache[product.id] = product;

      contentEl.innerHTML = renderProductDetail(product);
      _bindActions(product);

    } catch (err) {
      contentEl.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><h3>خطأ في التحميل</h3><p>${err.message}</p></div>`;
    }
  };

  const renderProductDetail = (p) => {
    const inCart = Cart.getQty(p.id) > 0;
    const isFav  = Favorites.has(p.id);
    const qty    = Cart.getQty(p.id);

    return `
      <!-- صورة المنتج -->
      <div style="position:relative;background:var(--gray-50);min-height:260px;display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${p.name_ar}"
               style="width:100%;max-height:300px;object-fit:contain"
               onerror="this.style.display='none'">`
          : `<span style="font-size:5rem">🛍️</span>`
        }
        ${!p.is_available ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2rem;font-weight:800">غير متوفر حالياً</div>` : ''}
        <button id="pd-fav-btn" style="position:absolute;top:12px;left:12px;background:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:1.3rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)">
          ${isFav ? '❤️' : '🤍'}
        </button>
      </div>

      <!-- تفاصيل -->
      <div style="padding:1.25rem">
        <div style="font-size:1.25rem;font-weight:800;color:var(--gray-900);margin-bottom:.25rem">${p.name_ar}</div>
        ${p.name_en ? `<div style="font-size:.85rem;color:var(--gray-400);margin-bottom:.5rem">${p.name_en}</div>` : ''}
        <div style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem">الوحدة: ${p.unit}</div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;background:var(--gray-50);border-radius:var(--radius);margin-bottom:1.25rem">
          <div>
            <div style="font-size:.75rem;color:var(--gray-500)">السعر</div>
            <div style="font-size:1.6rem;font-weight:900;color:var(--green-main)">${p.price.toFixed(2)} <span style="font-size:.9rem">ج.م</span></div>
          </div>
          ${p.is_available ? `
          <div id="pd-cart-ctrl">
            ${inCart
              ? `<div class="qty-control" style="transform:scale(1.1)">
                   <button class="qty-btn" id="pd-minus">−</button>
                   <span class="qty-num" id="pd-qty">${qty}</span>
                   <button class="qty-btn" id="pd-plus">+</button>
                 </div>`
              : `<button class="btn btn-primary" id="pd-add" style="padding:.6rem 1.5rem;font-size:1rem">+ أضف للسلة</button>`
            }
          </div>` : ''}
        </div>

        ${inCart ? `<div id="pd-subtotal" style="text-align:center;color:var(--green-main);font-weight:700;margin-bottom:1rem">الإجمالي: ${(p.price * qty).toFixed(2)} ج.م</div>` : '<div id="pd-subtotal"></div>'}

        ${p.is_available
          ? `<button class="btn btn-primary btn-full btn-lg" id="pd-goto-cart">🛒 اذهب للسلة</button>`
          : `<button class="btn btn-ghost btn-full" disabled>غير متوفر حالياً</button>`
        }
      </div>
    `;
  };

  const _bindActions = (p) => {
    const _updateCtrl = () => {
      const qty = Cart.getQty(p.id);
      const ctrl = document.getElementById('pd-cart-ctrl');
      const sub  = document.getElementById('pd-subtotal');
      if (!ctrl) return;
      if (qty > 0) {
        ctrl.innerHTML = `<div class="qty-control" style="transform:scale(1.1)">
          <button class="qty-btn" id="pd-minus">−</button>
          <span class="qty-num" id="pd-qty">${qty}</span>
          <button class="qty-btn" id="pd-plus">+</button>
        </div>`;
        if (sub) sub.innerHTML = `الإجمالي: ${(p.price * qty).toFixed(2)} ج.م`;
        document.getElementById('pd-minus')?.addEventListener('click', () => { Cart.updateQty(p.id, Cart.getQty(p.id) - 1); _updateCtrl(); });
        document.getElementById('pd-plus')?.addEventListener('click',  () => { Cart.updateQty(p.id, Cart.getQty(p.id) + 1); _updateCtrl(); });
      } else {
        ctrl.innerHTML = `<button class="btn btn-primary" id="pd-add" style="padding:.6rem 1.5rem;font-size:1rem">+ أضف للسلة</button>`;
        if (sub) sub.innerHTML = '';
        document.getElementById('pd-add')?.addEventListener('click', () => { Cart.add(p); _updateCtrl(); });
      }
    };

    document.getElementById('pd-add')?.addEventListener('click', () => { Cart.add(p); _updateCtrl(); });
    document.getElementById('pd-minus')?.addEventListener('click', () => { Cart.updateQty(p.id, Cart.getQty(p.id) - 1); _updateCtrl(); });
    document.getElementById('pd-plus')?.addEventListener('click',  () => { Cart.updateQty(p.id, Cart.getQty(p.id) + 1); _updateCtrl(); });
    document.getElementById('pd-fav-btn')?.addEventListener('click', () => {
      Favorites.toggle(p.id);
      const btn = document.getElementById('pd-fav-btn');
      if (btn) btn.textContent = Favorites.has(p.id) ? '❤️' : '🤍';
    });
    document.getElementById('pd-goto-cart')?.addEventListener('click', () => navigateTo('cart'));
  };

  return { render };
})();

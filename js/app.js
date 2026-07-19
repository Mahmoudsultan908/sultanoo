/**
 * Sultan Foods — App Bootstrap
 * ==============================
 * نقطة الدخول الرئيسية للتطبيق
 */

// ─── Shared Utilities (متاحة لكل الصفحات) ────────────────────────

const showToast = (() => {
  const container = document.getElementById('toast-container');
  return (msg, duration = 2500) => {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  };
})();

// ─── Product Card Renderer (مشترك) ───────────────────────────────

const renderProductCard = (p) => {
  window._productCache[p.id] = p; // Fix: يُخزَّن هنا لاستعادة زر + عند حذف من السلة
  const inCart = Cart.getQty(p.id) > 0;
  const isFav  = Favorites.has(p.id);

  return `
    <div class="product-card" data-pid="${p.id}" onclick="navigateTo('product', {id:'${p.id}'})">
      <div class="product-img-wrap">
        <img
          data-src="${p.image_url || ''}"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
          alt="${p.name_ar}"
          class="loading"
          loading="lazy">
        ${p.is_featured ? `<span class="badge-featured">⭐ عرض</span>` : ''}
        ${!p.is_available ? `<div class="badge-unavailable">غير متوفر</div>` : ''}
        <button class="fav-btn ${isFav ? 'active' : ''}"
          data-fav-btn="${p.id}"
          onclick="event.stopPropagation(); Favorites.toggle('${p.id}')">
          ${isFav ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name_ar}</div>
        <div class="product-unit">${p.unit}</div>
        <div class="product-footer">
          <div class="product-price">
            <span class="currency">ج.م</span>${p.price.toFixed(2)}
          </div>
          <div class="product-cart-ctrl" id="pcc-${p.id}">
            ${renderCartCtrl(p)}
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderCartCtrl = (p) => {
  if (!p.is_available) return '';
  const qty = Cart.getQty(p.id);
  if (qty > 0) {
    return `<div class="qty-control" id="qty-ctrl-${p.id}">
      <button class="qty-btn" onclick="event.stopPropagation(); Cart.updateQty('${p.id}', ${qty - 1})">−</button>
      <span class="qty-num">${qty}</span>
      <button class="qty-btn" onclick="event.stopPropagation(); Cart.updateQty('${p.id}', ${qty + 1})">+</button>
    </div>`;
  }
  return `<button class="add-btn" onclick="event.stopPropagation(); Cart.add(${JSON.stringify(p).replace(/"/g,'&quot;')})">+</button>`;
};

// تحديث فوري لأزرار الكمية عند تغيير السلة
const refreshProductCards = (items) => {
  items.forEach(item => {
    const ctrl = document.getElementById(`pcc-${item.id}`);
    if (!ctrl) return;
    const addBtn = ctrl.querySelector('.add-btn');
    const qtyCtrl = ctrl.querySelector('.qty-control');
    if (qtyCtrl) {
      // تحديث الكمية في العنصر الموجود
      const numEl = qtyCtrl.querySelector('.qty-num');
      if (numEl) numEl.textContent = item.quantity;
      const minus = qtyCtrl.querySelector('.qty-btn:first-child');
      const plus  = qtyCtrl.querySelector('.qty-btn:last-child');
      if (minus) minus.setAttribute('onclick', `event.stopPropagation(); Cart.updateQty('${item.id}', ${item.quantity - 1})`);
      if (plus)  plus.setAttribute('onclick',  `event.stopPropagation(); Cart.updateQty('${item.id}', ${item.quantity + 1})`);
    } else if (addBtn) {
      // تحويل زر + إلى qty-control
      addBtn.outerHTML = `<div class="qty-control" id="qty-ctrl-${item.id}">
        <button class="qty-btn" onclick="event.stopPropagation(); Cart.updateQty('${item.id}', 0)">−</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" onclick="event.stopPropagation(); Cart.updateQty('${item.id}', ${item.quantity + 1})">+</button>
      </div>`;
    }
  });

  // أي منتج اتشال من السلة — رجّع زر +
  document.querySelectorAll('.product-cart-ctrl').forEach(ctrl => {
    const pid = ctrl.id.replace('pcc-', '');
    if (!pid || Cart.getQty(pid) > 0) return;
    const qtyCtrl = ctrl.querySelector('.qty-control');
    if (!qtyCtrl) return;
    // ابحث عن بيانات المنتج من زر الإضافة القديم أو من data attr
    const card = ctrl.closest('[data-pid]');
    if (!card) { ctrl.innerHTML = ''; return; }
    // استعادة زر + من data
    const pData = window._productCache?.[pid];
    if (pData) {
      ctrl.innerHTML = `<button class="add-btn" onclick="event.stopPropagation(); Cart.add(${JSON.stringify(pData).replace(/"/g,'&quot;')})">+</button>`;
    }
  });
};

// ─── Lazy Image Loading ───────────────────────────────────────────

const lazyLoader = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.onload = () => img.classList.replace('loading', 'loaded');
        img.onerror = () => {
          img.classList.replace('loading', 'loaded');
          img.style.display = 'none';
        };
        lazyLoader.unobserve(img);
      }
    }
  });
}, { rootMargin: '200px' });

const observeLazyImages = () => {
  document.querySelectorAll('img[data-src]').forEach(img => lazyLoader.observe(img));
};

// MutationObserver لمراقبة الصور الجديدة
new MutationObserver(() => observeLazyImages())
  .observe(document.getElementById('main') || document.body, { childList: true, subtree: true });

// ─── App Init ─────────────────────────────────────────────────────

const App = {
  async init() {
    // Fix #1: تسجيل مستمع beforeinstallprompt أولاً قبل أي await
    // حتى لا يُفوَّت الحدث أثناء splash / تسجيل
    this.setupPWA();

    // 0. Product cache للـ refreshProductCards
    window._productCache = {};

    // 1. تهيئة الطبقات
    Storage.set;
    Cart.init();
    Favorites.init();

    // تحديث فوري لأزرار الكمية عند أي تغيير في السلة
    Cart.onChange((items) => refreshProductCards(items));

    // 2. تسجيل الصفحات في الراوتر
    Router.register('home',      (p) => HomePage.render(p));
    Router.register('category',  (p) => CategoryPage.render(p));
    Router.register('search',    (p) => SearchPage.render(p));
    Router.register('cart',      (p) => CartPage.render(p));
    Router.register('favorites', (p) => FavoritesPage.render(p));
    Router.register('orders',    (p) => OrdersPage.render(p));
    Router.register('profile',   (p) => ProfilePage.render(p));
    Router.register('product',   (p) => ProductPage.render(p));

    // 3. تهيئة Search
    SearchPage.init();

    // 4. Splash Screen
    await this.showSplash();

    // 5. تحميل الإعدادات من الشيت (في الخلفية)
    API.initSettings().catch(() => {});

    // 5b. تحديث بيانات العميل صامتاً (VIP + customer_type)
    if (API.isRegistered()) {
      const c = API.getCustomer();
      if (c?.phone) {
        API.getCustomerByPhone(c.phone).then(fresh => {
          if (!fresh) return;
          // حدّث فقط لو في تغيير حقيقي
          if (fresh.customer_type !== c.customer_type || fresh.name !== c.name) {
            Storage.set(Storage.KEYS.CUSTOMER, { ...c, ...fresh });
          }
        }).catch(() => {});
      }
    }

    // 5c. تحديث حالة الطلبات صامتاً في الخلفية — من أول ما التطبيق يفتح،
    //     مش لما المستخدم يفتح تبويب "طلباتي" بس (نفس منطق تحديث بيانات
    //     العميل فوق، بس للطلبات)
    if (API.isRegistered()) {
      const c = API.getCustomer();
      if (c?.id) {
        API.getOrders(c.id).then(serverOrders => {
          const history = API.getOrdersHistory();
          let changed = false;
          serverOrders.forEach(updated => {
            const idx = history.findIndex(o => o.id === updated.id);
            if (idx !== -1 && history[idx].status !== updated.status) {
              history[idx] = { ...history[idx], status: updated.status };
              changed = true;
            }
          });
          if (changed) Storage.set(Storage.KEYS.ORDERS_HISTORY, history);
        }).catch(() => {});
      }
    }

    // 6. تحقق التسجيل
    if (!API.isRegistered()) {
      await RegisterPage.init();
    }

    // 7. الانطلاق للرئيسية
    Router.navigate('home');

    // 8. Offline detection
    this.setupOffline();

    // 9. زر الرجوع في الأندرويد
    this.setupBackButton();
  },

  async showSplash() {
    return new Promise(resolve => {
      setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.classList.add('hide');
          setTimeout(() => { splash.remove(); resolve(); }, 500);
        } else {
          resolve();
        }
      }, CONFIG.UI.SPLASH_DURATION);
    });
  },

  setupOffline() {
    const banner = document.getElementById('offline-banner');
    const update = () => {
      if (banner) banner.classList.toggle('show', !navigator.onLine);
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  setupBackButton() {
    // أضف entry أولية حتى يُطلق Android حدث popstate عند الضغط على زر الرجوع
    window.history.pushState(null, '', location.href);

    let exitWarning = false;

    window.addEventListener('popstate', () => {
      if (Router.canGoBack()) {
        // ─── يوجد صفحة سابقة ───
        // أعد إضافة entry حتى يظل زر الرجوع قابلاً للاستخدام
        window.history.pushState(null, '', location.href);
        Router.goBack();
        exitWarning = false;

      } else {
        // ─── نحن في الصفحة الرئيسية ───
        if (exitWarning) {
          // الضغطة الثانية: اترك المتصفح يتصرف طبيعياً (يُغلق/يُصغّر التطبيق)
          // لا نُعيد pushState هنا
        } else {
          // الضغطة الأولى: أعد Entry وأظهر التحذير
          window.history.pushState(null, '', location.href);
          exitWarning = true;
          showToast('اضغط مرة أخرى للخروج من التطبيق');
          setTimeout(() => { exitWarning = false; }, 2000);
        }
      }
    });
  },

  setupPWA() {
    let deferredPrompt = null;

    // Fix #1: هذه الدالة تُستدعى دائماً عند الضغط على أي زر تثبيت
    const doInstall = async () => {
      if (!deferredPrompt) {
        // iOS أو متصفح لا يدعم — تعليمات يدوية
        showToast('📲 افتح قائمة المتصفح ← "إضافة إلى الشاشة الرئيسية"');
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('pwa-install-banner')?.style.setProperty('display', 'none');
        document.getElementById('install-btn')?.style.setProperty('display', 'none');
      }
      deferredPrompt = null;
    };

    // Fix #1: تسجيل زر صفحة التسجيل فوراً (موجود في DOM منذ البداية)
    document.getElementById('reg-install-btn')
      ?.addEventListener('click', doInstall);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // إظهار البانر البارز في الأعلى
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'flex';

      // زر التثبيت في صفحة البروفايل أيضاً
      const profileBtn = document.getElementById('install-btn');
      if (profileBtn) profileBtn.style.display = 'block';

      document.getElementById('pwa-install-banner-btn')?.addEventListener('click', doInstall);
      document.getElementById('pwa-install')?.addEventListener('click', doInstall);
      document.getElementById('pwa-install-banner-close')?.addEventListener('click', () => {
        if (banner) banner.style.display = 'none';
      });
    });
  },
};

// ─── Start ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());

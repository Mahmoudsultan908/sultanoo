/**
 * Sultan Foods — Favorites Business Logic
 */

const Favorites = (() => {
  let ids = new Set();
  const listeners = [];

  const notify = () => {
    Storage.set(Storage.KEYS.FAVORITES, [...ids]);
    listeners.forEach(fn => fn(ids));
    // حفظ في الشيت في الخلفية
    _syncToSheet();
  };

  const _syncToSheet = () => {
    try {
      const customer = API.getCustomer();
      if (!customer?.id) return;
      const favString = [...ids].join(',');
      API.updateCustomerFavorites(customer.id, customer.phone, favString).catch(() => {});
    } catch {}
  };

  const init = () => {
    const saved = Storage.get(Storage.KEYS.FAVORITES) || [];
    ids = new Set(saved);
  };

  // استرجاع id مباشرة بدون notify (عند التحميل من الشيت)
  const restoreId = (productId) => {
    if (productId) ids.add(String(productId).trim());
    Storage.set(Storage.KEYS.FAVORITES, [...ids]);
  };

  const toggle = (productId, productData = null) => {
    if (ids.has(productId)) {
      ids.delete(productId);
      showToast('💔 تم الحذف من المفضلة');
    } else {
      ids.add(productId);
      showToast('❤️ تمت الإضافة للمفضلة');
    }
    notify();
    document.querySelectorAll(`[data-fav-btn="${productId}"]`).forEach(btn => {
      btn.classList.toggle('active', ids.has(productId));
    });
  };

  const has       = (productId) => ids.has(productId);
  const getIds    = () => [...ids];
  const getCount  = () => ids.size;
  const onChange  = (fn) => listeners.push(fn);

  return { init, toggle, has, getIds, getCount, onChange, restoreId };
})();

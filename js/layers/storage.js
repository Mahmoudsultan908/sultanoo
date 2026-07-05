/**
 * Sultan Foods — Storage Layer
 * ================================
 * Abstraction فوق localStorage
 * يمكن استبداله بـ IndexedDB أو أي storage مستقبلاً
 */

const Storage = (() => {
  const PREFIX = 'sultan_';

  const key = (k) => `${PREFIX}${k}`;

  const set = (k, value) => {
    try {
      localStorage.setItem(key(k), JSON.stringify({ v: value, t: Date.now() }));
      return true;
    } catch (e) {
      console.warn('[Storage] set failed:', e);
      return false;
    }
  };

  const get = (k, defaultVal = null) => {
    try {
      const raw = localStorage.getItem(key(k));
      if (!raw) return defaultVal;
      const parsed = JSON.parse(raw);
      return parsed.v ?? defaultVal;
    } catch (e) {
      return defaultVal;
    }
  };

  const getWithTTL = (k, ttlMs, defaultVal = null) => {
    try {
      const raw = localStorage.getItem(key(k));
      if (!raw) return defaultVal;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.t > ttlMs) return defaultVal; // expired
      return parsed.v ?? defaultVal;
    } catch (e) {
      return defaultVal;
    }
  };

  const remove = (k) => {
    try { localStorage.removeItem(key(k)); } catch (e) {}
  };

  const clear = () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  };

  // ─── Specific Keys ───────────────────────────────────────────
  const KEYS = {
    CUSTOMER:       'customer',
    CART:           'cart',
    FAVORITES:      'favorites',
    LAST_ORDER:     'last_order',
    ORDERS_HISTORY: 'orders_history',
    CACHE_PRODUCTS: 'cache_products',
    CACHE_CATS:     'cache_categories',
    CACHE_AREAS:    'cache_areas',
    REGISTERED:     'is_registered',
  };

  return { set, get, getWithTTL, remove, clear, KEYS };
})();

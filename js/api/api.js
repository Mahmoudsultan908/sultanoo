/**
 * Sultan Foods — Unified API Layer ⭐
 * ======================================
 * هذا الملف هو الواجهة الوحيدة للبيانات في كل التطبيق.
 * لا يتغير هذا الملف أبداً — فقط الـ Provider يتغير.
 *
 * Usage:
 *   const products = await API.getProducts();
 *   await API.submitOrder(order, items);
 */

const API = (() => {
  // اختيار الـ Provider تلقائياً بناءً على الإعداد
  const getProvider = () => {
    if (CONFIG.DATA_PROVIDER === 'erp') return ERPProvider;
    return SheetsProvider;
  };

  // Cache helper داخلي
  const withCache = async (cacheKey, ttl, fetchFn) => {
    const cached = Storage.getWithTTL(cacheKey, ttl);
    if (cached) return cached;
    const data = await fetchFn();
    Storage.set(cacheKey, data);
    return data;
  };

  // ─── توليد ID فريد ─────────────────────────────────────────────
  const generateId = (prefix = '') => {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return prefix ? `${prefix}-${ts}-${rnd}` : `${ts}-${rnd}`;
  };

  // ─── Products ──────────────────────────────────────────────────
  const getProducts = async (forceRefresh = false) => {
    if (forceRefresh) Storage.remove(Storage.KEYS.CACHE_PRODUCTS);
    const products = await withCache(
      Storage.KEYS.CACHE_PRODUCTS,
      CONFIG.CACHE.TTL_PRODUCTS,
      () => getProvider().getProducts()
    );
    return applyCustomerPricing(products);
  };

  const getProductsByCategory = async (categoryId) => {
    const all = await getProducts();
    return all.filter(p =>
      p.is_available &&
      (p.category_id === categoryId || p.subcategory_id === categoryId)
    ).sort((a, b) => a.sort_order - b.sort_order);
  };

  const getFeatured = async () => {
    const all = await getProducts();
    return all.filter(p => p.is_available && p.is_featured);
  };

  const getBestsellers = async () => {
    const all = await getProducts();
    return all.filter(p => p.is_available && p.is_bestseller);
  };

  const searchProducts = async (query) => {
    if (!query || query.trim().length < 2) return [];
    const all = await getProducts();
    const q = query.trim().toLowerCase();
    return all.filter(p =>
      p.is_available &&
      (p.name_ar.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q))
    );
  };

  const getProductById = async (id) => {
    const all = await getProducts();
    return all.find(p => p.id === id) || null;
  };

  // ─── Categories ────────────────────────────────────────────────
  const getCategories = async () => {
    return withCache(
      Storage.KEYS.CACHE_CATS,
      CONFIG.CACHE.TTL_CATEGORIES,
      () => getProvider().getCategories()
    );
  };

  const getMainCategories = async () => {
    const all = await getCategories();
    return all.filter(c => !c.parent_id && c.is_active !== false).sort((a, b) => a.sort_order - b.sort_order);
  };

  const getSubcategories = async (parentId) => {
    const all = await getCategories();
    return all.filter(c => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  };

  // ─── Areas ─────────────────────────────────────────────────────
  const getAreas = async () => {
    return withCache(
      Storage.KEYS.CACHE_AREAS,
      CONFIG.CACHE.TTL_AREAS,
      () => getProvider().getAreas()
    );
  };

  // ─── Orders ────────────────────────────────────────────────────
  const submitOrder = async (cartItems, notes = '') => {
    const customer = Storage.get(Storage.KEYS.CUSTOMER);
    if (!customer) throw new Error('لم يتم تسجيل العميل');
    if (!cartItems.length) throw new Error('السلة فارغة');

    const orderId = generateId('ORD');
    const now = new Date().toISOString();
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const orderData = {
      id:             orderId,
      customer_id:    customer.id,
      customer_name:  customer.name       || '',
      customer_phone: customer.phone      || '',
      total_amount:   total,
      status:         'new',
      notes,
      created_at:     now,
      erp_order_id:   '',
    };

    const itemsData = cartItems.map((item, idx) => ({
      id: `${orderId}-ITEM-${idx + 1}`,
      order_id: orderId,
      product_id: item.id,
      product_name: item.name_ar,
      unit: item.unit,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    }));

    await getProvider().submitOrder(orderData, itemsData);

    // حفظ الطلب محلياً
    const history = Storage.get(Storage.KEYS.ORDERS_HISTORY) || [];
    history.unshift({ ...orderData, items: itemsData });
    Storage.set(Storage.KEYS.ORDERS_HISTORY, history.slice(0, 50));
    Storage.set(Storage.KEYS.LAST_ORDER, { ...orderData, items: itemsData });

    return { orderId, total, orderData, itemsData };
  };

  const getOrdersHistory = () => {
    return Storage.get(Storage.KEYS.ORDERS_HISTORY) || [];
  };

  const getLastOrder = () => {
    return Storage.get(Storage.KEYS.LAST_ORDER) || null;
  };

  // ─── Customer ──────────────────────────────────────────────────
  const registerCustomer = async (data) => {
    const id = generateId('CUS');
    const customerData = {
      id,
      name:         data.name,
      shop_name:    data.shop_name,
      phone:        data.phone,
      area_id:      data.area_id,
      area_name:    data.area_name,
      registered_at: new Date().toISOString(),
      erp_customer_id: '',
    };

    await getProvider().registerCustomer(customerData);
    Storage.set(Storage.KEYS.CUSTOMER, customerData);
    Storage.set(Storage.KEYS.REGISTERED, true);
    return customerData;
  };

  const getCustomer    = () => Storage.get(Storage.KEYS.CUSTOMER);
  const isRegistered   = () => !!Storage.get(Storage.KEYS.REGISTERED);

  const updateCustomer = async (data) => {
    const current = getCustomer();
    const updated  = { ...current, ...data };
    Storage.set(Storage.KEYS.CUSTOMER, updated);
    try { await getProvider().updateCustomer(updated); }
    catch (e) { console.warn('[Customer] sheet update failed:', e); }
    return updated;
  };

  const updateCustomerFavorites = async (customerId, phone, favString) => {
    try {
      await getProvider().updateCustomerFavorites(customerId, phone, favString);
    } catch {}
  };

  const getCustomerByPhone = async (phone) => {
    try { return await getProvider().getCustomerByPhone(phone); }
    catch { return null; }
  };

  // ─── Banners ───────────────────────────────────────────────────
  const getBanners = async () => {
    try {
      const rows = await getProvider().getBanners();
      return rows
        .filter(b => b.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
    } catch { return []; }
  };

  // ─── VIP Pricing ───────────────────────────────────────────────
  const applyCustomerPricing = (products) => {
    const customer = getCustomer();
    const isVip = String(customer?.customer_type || '').toLowerCase() === 'vip';
    if (!isVip) return products;
    return products.map(p => ({
      ...p,
      price: (p.price_vip && p.price_vip > 0) ? p.price_vip : p.price,
    }));
  };

  // ─── Settings ──────────────────────────────────────────────────
  const SETTINGS_CACHE_KEY = 'sultan_settings_cache';
  const SETTINGS_TTL       = 5 * 60 * 1000; // 5 دقائق (كان 30)

  const initSettings = async () => {
    try {
      const cached   = Storage.get(SETTINGS_CACHE_KEY);
      const cacheTs  = Storage.get(SETTINGS_CACHE_KEY + '_ts');
      const isValid  = cacheTs && (Date.now() - cacheTs) < SETTINGS_TTL;

      // Bug: {} فارغ truthy — يجب التحقق من وجود بيانات فعلية
      const hasCachedData = cached && Object.keys(cached).length > 0;
      const isValidCache  = isValid && hasCachedData;

      const settings = isValidCache ? cached : await getProvider().getSettings();

      // لا تحفظ في الكاش إذا كانت النتيجة فارغة — حتى تُعاد المحاولة
      if (!isValidCache && Object.keys(settings || {}).length > 0) {
        Storage.set(SETTINGS_CACHE_KEY,         settings);
        Storage.set(SETTINGS_CACHE_KEY + '_ts', Date.now());
      }

      // تطبيق الإعدادات على CONFIG
      // Fix #3: يدعم المفتاحَين min_order_amount و minimum_order
      const minVal = settings.min_order_amount ?? settings.minimum_order;
      if (minVal !== undefined && minVal !== '')
        CONFIG.ORDER.MIN_AMOUNT = Number(minVal) || 0;
      if (settings.whatsapp_number)
        CONFIG.WHATSAPP.NUMBER  = String(settings.whatsapp_number);
      if (settings.store_name)
        CONFIG.APP.NAME         = String(settings.store_name);

      return settings;
    } catch (e) {
      console.warn('[Settings] load failed:', e);
      return {};
    }
  };

  const getSettings = () => Storage.get(SETTINGS_CACHE_KEY) || {};
  const sendWhatsApp = (order, items) => {
    const customer = getCustomer();
    let msg = `🛒 *طلب جديد — سلطان للمواد الغذائية*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *العميل:* ${customer?.name || '—'}\n`;
    msg += `🏪 *المحل:* ${customer?.shop_name || '—'}\n`;
    msg += `📍 *المنطقة:* ${customer?.area_name || '—'}\n`;
    msg += `📞 *الهاتف:* ${customer?.phone || '—'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📦 *المنتجات:*\n`;
    items.forEach(item => {
      msg += `• ${item.product_name} × ${item.quantity} ${item.unit} — ${(item.price * item.quantity).toFixed(2)} ج.م\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *الإجمالي: ${order.total_amount.toFixed(2)} ج.م*\n`;
    if (order.notes) msg += `📝 *ملاحظات:* ${order.notes}\n`;
    msg += `🔖 *رقم الطلب:* ${order.id}`;

    const encoded = encodeURIComponent(msg);
    window.location.href = `https://api.whatsapp.com/send?phone=${CONFIG.WHATSAPP.NUMBER}&text=${encoded}`;
  };

  return {
    getProducts, getProductsByCategory, getFeatured, getBestsellers,
    searchProducts, getProductById,
    getCategories, getMainCategories, getSubcategories,
    getAreas, getBanners,
    submitOrder, getOrdersHistory, getLastOrder,
    registerCustomer, getCustomer, isRegistered, updateCustomer,
    getCustomerByPhone, updateCustomerFavorites,
    sendWhatsApp,
    initSettings, getSettings,
    generateId,
  };
})();

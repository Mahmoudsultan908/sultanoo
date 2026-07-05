/**
 * Sultan Foods — Sheets Provider v3
 * كل البيانات عبر Apps Script — مفيش API Key
 */

// ─── Customer Mapper ──────────────────────────────────────────────
const mapCustomer = (row) => ({
  id:            String(row.id            || '').trim(),
  name:          String(row.name          || '').trim(),
  shop_name:     String(row.shop_name     || '').trim(),
  phone:         String(row.phone         || '').trim(),
  area_id:       String(row.area_id       || '').trim(),
  area_name:     String(row.area_name     || '').trim(),
  customer_type: String(row.customer_type || 'regular').toLowerCase().trim(),
  favorites:     String(row.favorites     || '').trim(),
  registered_at: row.registered_at        || '',
  is_active:     String(row.is_active).toUpperCase() !== 'FALSE',
});

const SheetsProvider = (() => {
  const { APPS_SCRIPT_URL } = CONFIG.SHEETS;

  // ─── GET من Apps Script ────────────────────────────────────────
  const getAction = async (action, params = '') => {
    const url = `${APPS_SCRIPT_URL}?action=${action}${params}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`GET ${action} failed: ${res.status}`);
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message);
      return json.data || [];
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('انتهت مهلة الاتصال — تحقق من الإنترنت');
      throw err;
    }
  };

  // ─── POST لـ Apps Script ───────────────────────────────────────
  const postScript = async (payload) => {
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { status: 'ok' }; }
    } catch (err) {
      console.warn('[Script] POST failed:', err);
      return { status: 'offline' };
    }
  };

  // ─── Mappers ───────────────────────────────────────────────────
  const mapProduct = (row) => ({
    id:             String(row.id || '').trim(),
    name_ar:        row.name_ar || '',
    name_en:        row.name_en || '',
    category_id:    String(row.category_id || '').trim(),
    subcategory_id: String(row.subcategory_id || '').trim(),
    unit:           row.unit || '',
    price:          parseFloat(row.price) || 0,
    image_url:      row.image_url || '',
    is_available:   String(row.is_available).toUpperCase() === 'TRUE',
    is_featured:    String(row.is_featured).toUpperCase() === 'TRUE',
    is_bestseller:  String(row.is_bestseller).toUpperCase() === 'TRUE',
    stock_qty:      parseInt(row.stock_qty) || 0,
    min_stock:      parseInt(row.min_stock) || 0,
    min_qty:        parseInt(row.min_qty) || 1,
    max_qty:        parseInt(row.max_qty) || 999,
    price_vip:      parseFloat(row.price_vip) || 0,
    sort_order:     parseInt(row.sort_order) || 99,
    erp_product_id: row.erp_product_id || '',
    notes:          row.notes || '',
  });

  const mapCategory = (row) => ({
    id:         String(row.id || '').trim(),
    name_ar:    row.name_ar || '',
    name_en:    row.name_en || '',
    parent_id:  String(row.parent_id ?? '').trim(),
    image_url:  row.image_url || '',
    icon:       row.icon || '📦',
    sort_order: parseInt(row.sort_order) || 99,
    is_active:  String(row.is_active).toUpperCase() !== 'FALSE',
  });

  const mapArea = (row) => ({
    id:   String(row.id || ''),
    name: row.name || '',
  });

  const mapOrder = (row) => ({
    id:             String(row.id || ''),
    customer_id:    String(row.customer_id || ''),
    total_amount:   parseFloat(row.total_amount) || 0,
    status:         row.status || 'new',
    notes:          row.notes || '',
    created_at:     row.created_at || '',
    updated_at:     row.updated_at || '',
    erp_order_id:   row.erp_order_id || '',
    delivery_date:  row.delivery_date || '',
    payment_method: row.payment_method || 'cash',
  });

  // ─── Fallback Areas لو Script فشل ─────────────────────────────
  // لا مناطق وهمية — خيار "أخرى" فقط حتى يعود الاتصال
  const fallbackAreas = [
    { id: '', name: 'أخرى' },
  ];

  // ─── Public ────────────────────────────────────────────────────
  return {

    async getProducts() {
      const rows = await getAction('getProducts');
      return rows.map(mapProduct).filter(p => p.id);
    },

    async getCategories() {
      const rows = await getAction('getCategories');
      return rows.map(mapCategory).filter(c => c.id && c.is_active);
    },

    async getAreas() {
      try {
        const rows = await getAction('getAreas');
        const areas = rows.map(mapArea).filter(a => a.id && a.name);
        return areas.length ? areas : fallbackAreas;
      } catch {
        return fallbackAreas;
      }
    },

    async submitOrder(orderData, itemsData) {
      return postScript({
        type:           'order',
        id:             orderData.id,
        customer_id:    orderData.customer_id,
        customer_name:  orderData.customer_name  || '',  // Fix #4
        customer_phone: orderData.customer_phone || '',  // Fix #4
        total_amount:   orderData.total_amount,
        status:         orderData.status,
        notes:          orderData.notes,
        created_at:     orderData.created_at,
        items:          itemsData,
      });
    },

    async registerCustomer(customerData) {
      return postScript({
        type:          'customer',
        id:            customerData.id,
        name:          customerData.name,
        shop_name:     customerData.shop_name,
        phone:         customerData.phone,
        area_id:       customerData.area_id,
        area_name:     customerData.area_name,
        registered_at: customerData.registered_at,
      });
    },

    async getOrders(customerId) {
      try {
        const rows = await getAction('getOrders', `&customer_id=${customerId}`);
        return rows.map(mapOrder);
      } catch {
        return [];
      }
    },

    async getCustomerByPhone(phone) {
      try {
        const rows = await getAction('getCustomerByPhone', `&phone=${encodeURIComponent(phone)}`);
        return rows[0] ? mapCustomer(rows[0]) : null;
      } catch {
        return null;
      }
    },

    async updateCustomer(customerData) {
      return postScript({
        type:      'customer_update',
        id:        customerData.id,
        name:      customerData.name,
        shop_name: customerData.shop_name,
        phone:     customerData.phone,
        area_id:   customerData.area_id,
        area_name: customerData.area_name,
      });
    },

    async getSettings() {
      try {
        const rows = await getAction('getSettings');
        const map = {};
        rows.forEach(r => { if (r.key) map[String(r.key).trim()] = String(r.value ?? '').trim(); });
        return map;
      } catch {
        return {};
      }
    },

    async updateCustomerFavorites(customerId, phone, favString) {
      return postScript({
        type:      'customer_favorites_update',
        id:        customerId,
        phone:     phone,
        favorites: favString,
      });
    },

    async getBanners() {
      try {
        const rows = await getAction('getBanners');
        return rows.map(r => ({
          id:         String(r.id || '').trim(),
          title:      r.title     || '',
          subtitle:   r.subtitle  || '',
          image_url:  r.image_url || '',
          bg_color:   r.bg_color  || '#1a4731',
          link_to:    r.link_to   || '',
          is_active:  String(r.is_active).toUpperCase() !== 'FALSE',
          sort_order: parseInt(r.sort_order) || 99,
        }));
      } catch { return []; }
    },
  };
})();

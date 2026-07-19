/**
 * Sultan Foods — ERP Provider (نفس قاعدة بيانات سلطان ERP مباشرة، عبر Supabase)
 * ===============================================================
 * بيتكلم مباشرة مع دوال Postgres (fn_sultano_*) اللي بترجع نفس شكل
 * البيانات اللي SheetsProvider كان بيرجّعه بالظبط — عشان api.js وكل
 * الصفحات تفضل شغالة من غير أي تعديل. الأسعار والتوفر (stock) بيتحسبوا
 * على السيرفر دايماً، مش من الكلاينت — حتى لو حد نادى الدالة مباشرة
 * بمفتاح anon مش من التطبيق، السعر والكمية بيتحسبوا من عند سلطان ERP نفسه.
 */

const ERPProvider = (() => {
  const getCustomerId = () => {
    const c = Storage.get(Storage.KEYS.CUSTOMER);
    return c?.id || null;
  };

  const mapProduct = (row) => ({
    id:             row.id,
    name_ar:        row.name_ar || '',
    name_en:        row.name_en || '',
    category_id:    row.category_id || '',
    subcategory_id: row.subcategory_id || '',
    unit:           row.unit || '',
    price:          Number(row.price) || 0,
    image_url:      row.image_url || '',
    is_available:   !!row.is_available,
    is_featured:    !!row.is_featured,
    is_bestseller:  !!row.is_bestseller,
    stock_qty:      Number(row.stock_qty) || 0,
    min_stock:      Number(row.min_stock) || 0,
    min_qty:        Number(row.min_qty) || 1,
    max_qty:        Number(row.max_qty) || 999,
    price_vip:      Number(row.price_vip) || 0,
    sort_order:     Number(row.sort_order) || 99,
    erp_product_id: row.erp_product_id || '',
    notes:          row.notes || '',
  });

  const mapCategory = (row) => ({
    id:         row.id,
    name_ar:    row.name_ar || '',
    name_en:    row.name_en || '',
    parent_id:  row.parent_id || '',
    image_url:  row.image_url || '',
    icon:       row.icon || '📦',
    sort_order: Number(row.sort_order) || 99,
    is_active:  row.is_active !== false,
  });

  const mapArea = (row) => ({ id: row.id, name: row.name || '' });

  const mapCustomer = (row) => row ? ({
    id:            row.id,
    name:          row.name || '',
    shop_name:     row.name || '',
    phone:         row.phone || '',
    area_id:       row.region_id || '',
    area_name:     row.region_name || row.address || '',
    customer_type: 'regular',
    favorites:     '',
    registered_at: row.created_at || '',
    is_active:     true,
  }) : null;

  const mapOrder = (row) => ({
    id:             row.id,
    customer_id:    row.customer_id,
    total_amount:   Number(row.total_amount) || 0,
    status:         row.status || 'new',
    notes:          row.notes || '',
    created_at:     row.created_at || '',
    updated_at:     row.updated_at || '',
    erp_order_id:   row.erp_order_id || '',
    delivery_date:  row.delivery_date || '',
    payment_method: row.payment_method || 'cash',
  });

  return {
    async getProducts() {
      const { data, error } = await sb.rpc('fn_sultano_get_priced_products', { p_customer_id: getCustomerId() });
      if (error) throw error;
      return (data || []).map(mapProduct);
    },

    async getCategories() {
      const { data, error } = await sb.rpc('fn_sultano_get_categories');
      if (error) throw error;
      return (data || []).map(mapCategory);
    },

    async getAreas() {
      const { data, error } = await sb.rpc('fn_sultano_get_areas');
      if (error) throw error;
      return (data || []).map(mapArea);
    },

    async submitOrder(order, items) {
      const { error } = await sb.rpc('fn_sultano_submit_order', {
        p_customer_id: order.customer_id,
        p_items: (items || []).map(it => ({ product_id: it.product_id, qty: it.quantity })),
        p_notes: order.notes || null,
        p_client_order_id: order.id,
      });
      if (error) throw error;
    },

    async registerCustomer(data) {
      const { data: newId, error } = await sb.rpc('fn_sultano_register_customer', {
        p_name: data.name, p_shop_name: data.shop_name, p_phone: data.phone,
        p_area_id: data.area_id || null, p_area_name: data.area_name || null,
      });
      if (error) throw error;
      // ★ لازم نرجّع الـ id الحقيقي — api.js بيفضّله على الـ id المحلي
      //   المؤقت لو موجود (راجع registerCustomer في api.js)
      return { id: newId };
    },

    async getOrders(customerId) {
      const { data, error } = await sb.rpc('fn_sultano_get_orders', { p_customer_id: customerId });
      if (error) throw error;
      return (data || []).map(mapOrder);
    },

    async getOrderStatus(orderId) {
      const { data, error } = await sb.rpc('fn_sultano_get_order_status', {
        p_customer_id: getCustomerId(), p_order_id: orderId,
      });
      if (error) throw error;
      return data?.[0] || null;
    },

    async getCustomerAccount(id) {
      const { data, error } = await sb.rpc('fn_sultano_get_customer_account', { p_customer_id: id });
      if (error) throw error;
      return data?.[0] || null;
    },

    async getCustomerByPhone(phone) {
      const { data, error } = await sb.rpc('fn_sultano_get_customer_by_phone', { p_phone: phone });
      if (error) throw error;
      return mapCustomer(data?.[0]);
    },

    async updateCustomer(customerData) {
      // تعديلات بيانات عميل حقيقي من سلطانو بتتسجّل "معلّقة" للمراجعة، زي
      // بالظبط تعديلات المندوبين — عن طريق RPC مخصص (مفيش auth.uid() هنا
      // عشان سلطانو مستخدم مجهول، فـ RLS العادية على الجدول مش هتسمح بـ
      // insert مباشر)
      const { error } = await sb.rpc('fn_sultano_request_customer_update', {
        p_customer_id: customerData.id,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_address: [customerData.shop_name, customerData.area_name].filter(Boolean).join(' / '),
      });
      if (error) throw error;
    },

    async updateCustomerFavorites() { /* مفيش تخزين مفضّلة في سلطان ERP حالياً */ },

    async getBanners() { return []; },

    async getSettings() { return {}; },
  };
})();

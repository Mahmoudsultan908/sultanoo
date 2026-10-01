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
  // ★ الهوية دلوقتي بتذكرة دخول (session_token) بتتولّد وقت الدخول بالتليفون + الرقم السري،
  //   مش برقم العميل (uuid). السيرفر بيعرف العميل من التذكرة، فمعرفة رقم عميل لوحدها ما بتفيدش.
  const getToken = () => {
    const c = Storage.get(Storage.KEYS.CUSTOMER);
    return c?.session_token || null;
  };

  // التذكرة خلصت أو اتلغت (مثلاً الشركة غيّرت الرقم السري، أو عميل قديم من قبل التذاكر):
  // نمسح التسجيل المحلي ونرجّع العميل لشاشة الدخول
  const onSessionExpired = () => {
    try {
      Storage.remove(Storage.KEYS.CUSTOMER);
      Storage.remove(Storage.KEYS.REGISTERED);
    } catch { /* مش مهم */ }
    if (!window.__sessionResetting) {
      window.__sessionResetting = true;
      setTimeout(() => location.reload(), 300);
    }
  };

  // بينادي دالة السيرفر ويتصرف مع خطأ "invalid session"
  const rpcT = async (name, params) => {
    const { data, error } = await sb.rpc(name, params);
    if (error) {
      if (/invalid session/i.test(error.message || '')) onSessionExpired();
      throw error;
    }
    return data;
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

  const mapArea = (row) => ({ id: row.id, name: row.name || '', min_order_amount: Number(row.min_order_amount) || 0 });

  const mapBanner = (row) => ({
    id: row.id, title: row.title || '', subtitle: row.subtitle || '',
    image_url: row.image_url || '', bg_color: row.bg_color || '#1a4731',
    link_to: row.link_to || '', is_active: true, sort_order: Number(row.sort_order) || 99,
    display_type: row.display_type || 'carousel',
  });

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
    session_token: row.session_token || '',
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
      const data = await rpcT('fn_sultano_get_priced_products_t', { p_token: getToken() });
      return (data || []).map(mapProduct);
    },

    async getCategories() {
      const { data, error } = await sb.rpc('fn_sultano_get_categories');
      if (error) throw error;
      return (data || []).map(mapCategory);
    },

    // "الأقسام الفرعية" في سلطان ERP هي الشركات المصنّعة (product_companies) —
    // بنرجّع بس اللي عندها صنف فعّال جوه القسم الرئيسي ده تحديدًا
    async getSubcategories(categoryId) {
      const { data, error } = await sb.rpc('fn_sultano_get_subcategories', { p_category_id: categoryId });
      if (error) throw error;
      return (data || []).map(mapCategory);
    },

    async getAreas() {
      const { data, error } = await sb.rpc('fn_sultano_get_areas');
      if (error) throw error;
      return (data || []).map(mapArea);
    },

    async submitOrder(order, items) {
      await rpcT('fn_sultano_submit_order_t', {
        p_token: getToken(),
        p_items: (items || []).map(it => ({ product_id: it.product_id, qty: it.quantity })),
        p_notes: order.notes || null,
        p_client_order_id: order.id,
      });
    },

    // هل موظف كمّل الطلب ده من عنده في سلطان ERP من وقت آخر محاولة إرسال
    // فشلت؟ — بيمنع إعادة إرسال (يدوي أو أوتوماتيك) لطلب اتنفّذ بالفعل
    async checkCartFulfilled(customerId, sinceIso) {
      const data = await rpcT('fn_sultano_check_cart_fulfilled_t', {
        p_token: getToken(),
        p_since: sinceIso,
      });
      return !!data;
    },

    // نسخة حيّة من سلة العميل في سلطان ERP — عشان لو العميل اتعطّل معاه
    // الإرسال، الأدمن يشوف بالظبط اللي في سلته ويكمّل الطلبية من عنده.
    // فشل الاتصال هنا مش لازم يبوّظ تجربة العميل، فبيتبلع بهدوء من اللي بينادي
    async syncCart(customerId, items) {
      await rpcT('fn_sultano_sync_cart_t', {
        p_token: getToken(),
        p_items: (items || []).map(it => ({ product_id: it.id, name: it.name_ar, unit: it.unit, price: it.price, qty: it.quantity })),
      });
    },
    async clearCart(customerId) {
      await rpcT('fn_sultano_clear_cart_t', { p_token: getToken() });
    },

    async registerCustomer(data) {
      const { data: newId, error } = await sb.rpc('fn_sultano_register_customer', {
        p_name: data.name, p_shop_name: data.shop_name, p_phone: data.phone,
        p_area_id: data.area_id || null, p_area_name: data.area_name || null,
        p_pin: data.pin || null,
      });
      if (error) throw error;
      // ★ لازم نرجّع الـ id الحقيقي — api.js بيفضّله على الـ id المحلي
      //   المؤقت لو موجود (راجع registerCustomer في api.js)
      // والعميل الجديد اختار رقمه السري وقت التسجيل، فبنسجّله دخول فوراً عشان ياخد تذكرته
      let session_token = '';
      if (data.pin) {
        try {
          const { data: lg } = await sb.rpc('fn_sultano_login_v2', { p_phone: data.phone, p_pin: data.pin });
          session_token = lg?.[0]?.session_token || '';
        } catch { /* لو فشل، العميل يدخل بالتليفون والرقم السري من شاشة الدخول */ }
      }
      return { id: newId, session_token };
    },

    async getOrders(customerId) {
      const data = await rpcT('fn_sultano_get_orders_t', { p_token: getToken() });
      return (data || []).map(mapOrder);
    },

    async getOrderStatus(orderId) {
      const data = await rpcT('fn_sultano_get_order_status_t', { p_token: getToken(), p_order_id: orderId });
      return data?.[0] || null;
    },

    async getCustomerAccount(id) {
      const data = await rpcT('fn_sultano_get_customer_account_t', { p_token: getToken() });
      return data?.[0] || null;
    },

    // ★ دخول بالتليفون + الرقم السري (مفيش دخول برقم التليفون لوحده). بيرجّع null لأي فشل
    //   (رقم غلط / مفيش رقم سري / الحساب مقفول مؤقتاً) من غير ما يفرّق، عشان ما نكشفش مين عميل عندنا.
    //   لو نجح، بيرجّع كمان التذكرة (session_token) اللي بتتبعت مع كل طلب بعد كده.
    async login(phone, pin) {
      const { data, error } = await sb.rpc('fn_sultano_login_v2', { p_phone: phone, p_pin: pin });
      if (error) throw error;
      return mapCustomer(data?.[0]);
    },

    // تسجيل خروج (بيلغي التذكرة على السيرفر)؛ الفشل مش مهم
    async logout() {
      const t = getToken();
      if (!t) return;
      try { await sb.rpc('fn_sultano_logout_t', { p_token: t }); } catch { /* مش مهم */ }
    },

    async updateCustomer(customerData) {
      // تعديلات بيانات عميل حقيقي من سلطانو بتتسجّل "معلّقة" للمراجعة، زي
      // بالظبط تعديلات المندوبين — عن طريق RPC مخصص (مفيش auth.uid() هنا
      // عشان سلطانو مستخدم مجهول، فـ RLS العادية على الجدول مش هتسمح بـ
      // insert مباشر)
      await rpcT('fn_sultano_request_customer_update_t', {
        p_token: getToken(),
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_address: [customerData.shop_name, customerData.area_name].filter(Boolean).join(' / '),
      });
    },

    async updateCustomerFavorites() { /* مفيش تخزين مفضّلة في سلطان ERP حالياً */ },

    async savePushSubscription(sub) {
      await rpcT('fn_sultano_save_push_subscription_t', {
        p_token: getToken(), p_endpoint: sub.endpoint,
        p_p256dh: sub.p256dh, p_auth: sub.auth, p_user_agent: sub.user_agent || null,
      });
    },

    async removePushSubscription(endpoint) {
      const { error } = await sb.rpc('fn_sultano_remove_push_subscription', { p_endpoint: endpoint });
      if (error) throw error;
    },

    async getBanners() {
      const { data, error } = await sb.rpc('fn_sultano_get_banners');
      if (error) throw error;
      return (data || []).map(mapBanner);
    },

    async getSettings() {
      const { data, error } = await sb.rpc('fn_sultano_get_settings');
      if (error) throw error;
      const row = data?.[0] || {};
      return {
        min_order_amount:      Number(row.min_order_amount) || 0,
        whatsapp_number:       row.whatsapp_number || '',
        store_name:            row.store_name || '',
        // وضع الإجازة — قفل كامل للتطبيق + بانر، بيتحكم فيه من سلطان ERP
        vacation_mode:         row.vacation_mode === true || row.vacation_mode === 'true',
        vacation_message:      row.vacation_message || '',
        // شكل قائمة الرئيسية: 'main' أقسام رئيسية (افتراضي) أو 'sub' أقسام فرعية مباشرة
        category_display_mode: row.category_display_mode || 'main',
      };
    },

    // نظام نقاط الولاء — لسه اختياري، قد يكون الـRPC غير موجود لحد ما
    // يتشغّل الـmigration، أو enabled=false، فبيتنادى دايمًا بـ try/catch
    // من عند اللي بينادي (renderLoyalty في profile.js)
    async getLoyaltySettings() {
      const { data, error } = await sb.rpc('fn_sultano_get_loyalty_settings');
      if (error) throw error;
      return { enabled: !!data?.[0]?.enabled, points_per_egp: Number(data?.[0]?.points_per_egp) || 0 };
    },

    async getCustomerLoyalty(customerId) {
      const data = await rpcT('fn_sultano_get_customer_loyalty_t', { p_token: getToken() });
      return Number(data?.[0]?.points_balance) || 0;
    },
  };
})();

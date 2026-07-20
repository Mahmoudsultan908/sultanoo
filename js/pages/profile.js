/**
 * Sultan Foods — Profile Page
 */

const ProfilePage = (() => {
  const render = () => {
    const customer = API.getCustomer();
    if (!customer) return;

    document.getElementById('profile-name').textContent = customer.name || '—';
    document.getElementById('profile-shop').textContent = customer.shop_name || '—';
    document.getElementById('profile-row-name').textContent = customer.name || '—';
    document.getElementById('profile-row-shop').textContent = customer.shop_name || '—';
    document.getElementById('profile-row-phone').textContent = customer.phone || '—';
    document.getElementById('profile-row-area').textContent = customer.area_name || '—';

    const orders      = API.getOrdersHistory();
    const ordersCount = orders.length;
    const now         = new Date();
    const monthOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = monthOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

    document.getElementById('profile-orders-count').textContent = ordersCount;
    document.getElementById('profile-fav-count').textContent    = Favorites.getCount();

    // كشف حساب العميل (الرصيد الحالي + حد الائتمان)
    const statementEl = document.getElementById('profile-statement');
    if (statementEl && customer?.id) {
      API.getCustomerAccount(customer.id).then(acc => {
        if (!acc) { statementEl.innerHTML = ''; return; }
        const balance = Number(acc.balance) || 0;
        statementEl.innerHTML = `
          <div class="profile-card" style="margin:0 1rem 1rem">
            <div class="profile-card-header">🧾 كشف حسابك</div>
            <div class="profile-rows">
              <div class="profile-row">
                <span class="row-label">الرصيد الحالي</span>
                <span class="row-value" style="color:${balance>0?'var(--danger)':'var(--green-main)'}">${balance.toFixed(2)} ج.م${balance>0?' (عليك)':''}</span>
              </div>
              <div class="profile-row">
                <span class="row-label">حد الائتمان</span>
                <span class="row-value">${Number(acc.credit_limit||0).toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>`;
      }).catch(() => { statementEl.innerHTML = ''; });
    }

    // إحصائيات الشهر
    const statsEl = document.getElementById('profile-month-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="profile-card" style="margin:0 1rem 1rem">
          <div class="profile-card-header">📊 إحصائيات هذا الشهر</div>
          <div class="profile-rows">
            <div class="profile-row">
              <span class="row-label">عدد الطلبات</span>
              <span class="row-value">${monthOrders.length} طلب</span>
            </div>
            <div class="profile-row">
              <span class="row-label">إجمالي المشتريات</span>
              <span class="row-value">${monthTotal.toFixed(0)} ج.م</span>
            </div>
          </div>
        </div>`;
    }
    renderSettings();
  };

  const openEdit = async () => {
    const customer = API.getCustomer();
    const overlay = document.getElementById('edit-overlay');
    overlay.classList.add('active');

    // تحميل المناطق
    const areaSelect = document.getElementById('edit-area');
    try {
      const areas = await API.getAreas();
      areaSelect.innerHTML = `<option value="">اختر المنطقة</option>` +
        areas.map(a => `<option value="${a.id}" data-name="${a.name}" ${a.id === customer?.area_id ? 'selected' : ''}>${a.name}</option>`).join('');
    } catch (e) {
      areaSelect.innerHTML = `<option value="${customer?.area_id || ''}">${customer?.area_name || 'اختر المنطقة'}</option>`;
    }

    // ملء البيانات
    document.getElementById('edit-name').value = customer?.name || '';
    document.getElementById('edit-shop').value = customer?.shop_name || '';
    document.getElementById('edit-phone').value = customer?.phone || '';
  };

  const closeEdit = () => {
    document.getElementById('edit-overlay').classList.remove('active');
  };

  const saveEdit = async () => {
    const name = document.getElementById('edit-name').value.trim();
    const shop = document.getElementById('edit-shop').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const areaSelect = document.getElementById('edit-area');
    const areaId = areaSelect.value;
    const areaName = areaSelect.selectedOptions[0]?.dataset.name || '';

    if (!name)  { showToast('⚠️ أدخل الاسم'); return; }
    if (!phone) { showToast('⚠️ أدخل الهاتف'); return; }

    const btn = document.querySelector('#edit-overlay .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...'; }

    await API.updateCustomer({ name, shop_name: shop, phone, area_id: areaId, area_name: areaName });

    if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    closeEdit();
    render();
    showToast('✅ تم حفظ البيانات');
  };

  const renderSettings = () => {
    const s = API.getSettings();
    const el = document.getElementById('settings-section');
    if (!el) return;
    const min = CONFIG.ORDER?.MIN_AMOUNT || s.min_order_amount || 0;
    const wa  = CONFIG.WHATSAPP?.NUMBER  || s.whatsapp_number  || '—';
    el.innerHTML = `
      <div class="profile-card" style="margin-top:1rem">
        <div class="profile-card-header" style="display:flex;align-items:center;justify-content:space-between">
          <span>⚙️ إعدادات التطبيق</span>
          <button class="btn btn-ghost btn-sm" onclick="ProfilePage.refreshSettings()" id="settings-refresh-btn">🔄 تحديث</button>
        </div>
        <div class="profile-rows">
          <div class="profile-row"><span class="row-label">الحد الأدنى للطلب</span><span class="row-value">${Number(min) > 0 ? Number(min) + ' ج.م' : 'بدون حد'}</span></div>
          <div class="profile-row"><span class="row-label">رقم واتساب</span><span class="row-value" dir="ltr">${wa}</span></div>
          <div class="profile-row"><span class="row-label">اسم التطبيق</span><span class="row-value">${CONFIG.APP?.NAME || s.store_name || 'سلطان للمواد الغذائية'}</span></div>
        </div>
        <p style="font-size:.75rem;color:var(--gray-400);text-align:center;margin-top:.5rem">لتغيير الإعدادات: عدّل شيت Settings في Google Sheet</p>
      </div>`;
  };

  const refreshSettings = async () => {
    const btn = document.getElementById('settings-refresh-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    // مسح الكاش وإعادة التحميل
    Storage.remove('sultan_settings_cache');
    Storage.remove('sultan_settings_cache_ts');
    await API.initSettings();
    renderSettings();
    if (btn) { btn.disabled = false; btn.textContent = '🔄 تحديث'; }
    showToast('✅ تم تحديث الإعدادات');
  };

  // مفيش خاصية "تسجيل خروج" حقيقية (سلطانو مربوط بالتليفون مش بحساب/كلمة
  // سر)، بس ده زرار طوارئ يمسح التسجيل المحلي (بيانات العميل + السلة +
  // المفضلة) ويرجّع المستخدم لشاشة التسجيل من جديد — مفيد لو حصل خلل زي
  // اللي حصل بعد التحويل لـ ERP (عميل قديم عالق بـ id مكسور من غير طريقة
  // يصلحه بنفسه)
  const resetRegistration = () => {
    if (!confirm('هيتم مسح تسجيلك الحالي وترجع لشاشة التسجيل من الأول. متابعة؟')) return;
    Storage.remove(Storage.KEYS.CUSTOMER);
    Storage.remove(Storage.KEYS.REGISTERED);
    location.reload();
  };

  return { render, openEdit, closeEdit, saveEdit, refreshSettings, resetRegistration };
})();

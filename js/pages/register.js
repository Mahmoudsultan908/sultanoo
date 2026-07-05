/**
 * Sultan Foods — Register Page v2.2
 * التسجيل يعمل دائماً حتى لو فشل حفظ البيانات في الشيت
 */

const RegisterPage = (() => {

  const init = async () => {
    const screen = document.getElementById('register-screen');
    if (!screen) return;
    screen.classList.add('active');
    await loadAreas();
    bindForm();
  };

  const loadAreas = async () => {
    const select = document.getElementById('reg-area');
    if (!select) return;

    select.innerHTML = '<option value="">جاري التحميل...</option>';

    try {
      // getAreas لها fallback داخلي — لن تفشل أبداً
      const areas = await API.getAreas();
      select.innerHTML =
        '<option value="">— اختر منطقتك —</option>' +
        areas.map(a =>
          `<option value="${a.id}" data-name="${a.name}">${a.name}</option>`
        ).join('');
    } catch {
      // آخر خط دفاع — حقل نصي
      select.outerHTML = `<input class="form-control" id="reg-area-text"
        type="text" placeholder="اكتب اسم منطقتك">`;
    }
  };

  const bindForm = () => {
    document.getElementById('reg-submit')
      ?.addEventListener('click', submit);
  };

  const submit = async () => {
    const name  = (document.getElementById('reg-name')?.value  || '').trim();
    const shop  = (document.getElementById('reg-shop')?.value  || '').trim();
    const phone = (document.getElementById('reg-phone')?.value || '').trim();

    const areaSelect = document.getElementById('reg-area');
    const areaText   = document.getElementById('reg-area-text');
    let areaId = '', areaName = '';
    if (areaSelect) {
      areaId   = areaSelect.value;
      areaName = areaSelect.selectedOptions[0]?.dataset?.name || '';
    } else if (areaText) {
      areaName = areaText.value.trim();
    }

    if (!name)  { flash('reg-name',  'أدخل اسمك الكامل'); return; }
    if (!phone || phone.length < 8) { flash('reg-phone', 'أدخل رقم هاتف صحيح'); return; }
    if (!areaId && !areaName) { showToast('⚠️ اختر منطقتك'); return; }

    // توحيد صيغة التليفون: 01xxxxxxx ↔ 201xxxxxxx
    const norm = (p) => {
      const d = p.replace(/\D/g, '');
      return d.startsWith('0') && d.length === 11 ? '2' + d : d;
    };
    const phone2 = norm(phone); // النسخة الدولية

    const btn = document.getElementById('reg-submit');
    btn.disabled    = true;
    btn.textContent = '⏳ جاري التحقق...';

    try {
      // ── هل رقم التليفون مسجّل من قبل؟ (بصيغتين) ──
      const existing = await API.getCustomerByPhone(phone)
                    || await API.getCustomerByPhone(phone2);
      if (existing) {
        Storage.set(Storage.KEYS.CUSTOMER,   existing);
        Storage.set(Storage.KEYS.REGISTERED, true);

        // ── استرجاع الطلبات القديمة من الشيت ──
        try {
          const sheetOrders = await SheetsProvider.getOrders(existing.id);
          if (sheetOrders && sheetOrders.length > 0) {
            Storage.set(Storage.KEYS.ORDERS_HISTORY, sheetOrders);
          }
        } catch {}

        // ── استرجاع المفضلة ──
        try {
          if (existing.favorites) {
            const favIds = String(existing.favorites).split(',').map(s => s.trim()).filter(Boolean);
            favIds.forEach(id => Favorites.restoreId(id));
          }
        } catch {}

        document.getElementById('register-screen').classList.remove('active');
        showToast(`🎉 أهلاً بعودتك ${existing.name}!`);
        btn.disabled    = false;
        btn.textContent = 'ابدأ التسوق →';
        return;
      }
    } catch { /* فشل الاتصال — كمّل التسجيل الجديد */ }

    // ── تسجيل جديد ──
    btn.textContent = '⏳ جاري التسجيل...';
    try {
      await API.registerCustomer({ name, shop_name: shop, phone, area_id: areaId, area_name: areaName });
    } catch (err) {
      console.warn('[Register] save failed (non-critical):', err);
    }

    document.getElementById('register-screen').classList.remove('active');
    showToast(`🎉 أهلاً ${name}! يمكنك التسوق الآن`);
    btn.disabled    = false;
    btn.textContent = 'ابدأ التسوق →';
  };

  const flash = (id, msg) => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.style.borderColor = 'var(--danger)';
      setTimeout(() => (el.style.borderColor = ''), 2000);
    }
    showToast(`⚠️ ${msg}`);
  };

  return { init };
})();

/**
 * Sultan Foods — Register Page v2.2
 * التسجيل يعمل دائماً حتى لو فشل حفظ البيانات في الشيت
 */

const RegisterPage = (() => {

  const init = async () => {
    const screen = document.getElementById('register-screen');
    if (!screen) return;
    screen.classList.add('active');
    bindForm();
    setMode(true);   // أول ما التطبيق يفتح: صفحة الدخول (أغلب العملاء عندهم حساب)، وتحتها زرار "عميل جديد"
    await loadAreas();
    setMode(loginMode);   // لو القايمة اتبدّلت بحقل نصي، نعيد إخفاء/إظهار الحقول حسب الوضع الحالي
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

  let loginMode = false;

  // تبديل بين "عميل جديد" و"عندي حساب — دخول" (الدخول بيخفي الاسم/المحل/المنطقة)
  const setMode = (login) => {
    loginMode = login;
    ['reg-name', 'reg-shop', 'reg-area', 'reg-area-text'].forEach(id => {
      const g = document.getElementById(id)?.closest('.form-group');
      if (g) g.style.display = login ? 'none' : '';
    });
    const hint = document.getElementById('reg-pin-hint');
    if (hint) hint.textContent = login
      ? 'الرقم السري بتاخده من الشركة. لو معندكش، كلّمنا.'
      : 'اختار رقم سري من 4 لـ 8 أرقام، هتحتاجه لما تدخل من جهاز تاني.';
    const btn = document.getElementById('reg-submit'); if (btn) btn.textContent = login ? 'دخول →' : 'ابدأ التسوق →';
    const tg = document.getElementById('reg-mode-toggle');
    if (tg) {
      tg.textContent = login ? '🆕 عميل جديد؟ سجّل حساب وابدأ التسوق' : 'عندي حساب — تسجيل دخول';
      tg.classList.toggle('btn-outline', login);   // الزرار الأساسي تحت الدخول واضح، وتحت التسجيل خفيف
      tg.classList.toggle('btn-ghost', !login);
      tg.style.fontWeight = login ? '700' : '';
    }
    const title = document.getElementById('reg-title'), sub = document.getElementById('reg-sub');
    if (title) title.textContent = login ? 'أهلاً بيك!' : 'مرحباً بك!';
    if (sub) sub.textContent = login ? 'ادخل برقم تليفونك والرقم السري' : 'أدخل بياناتك لبدء التسوق';
  };

  const bindForm = () => {
    document.getElementById('reg-submit')
      ?.addEventListener('click', submit);
    document.getElementById('reg-mode-toggle')
      ?.addEventListener('click', () => setMode(!loginMode));
  };

  const finishEntry = (customer, welcome) => {
    document.getElementById('register-screen').classList.remove('active');
    showToast(welcome);
    setTimeout(() => Push.showPrompt(), 1500);
  };

  const doLogin = async (phone, pin) => {
    const btn = document.getElementById('reg-submit');
    btn.disabled = true; btn.textContent = '⏳ جاري الدخول...';
    try {
      const existing = await API.loginCustomer(phone, pin);
      if (!existing) { showToast('⚠️ رقم التليفون أو الرقم السري غير صحيح (أو الحساب مقفول 15 دقيقة بعد محاولات كتير)'); return; }
      try {
        const oldOrders = await API.getOrders(existing.id);
        if (oldOrders && oldOrders.length > 0) Storage.set(Storage.KEYS.ORDERS_HISTORY, oldOrders);
      } catch {}
      finishEntry(existing, `🎉 أهلاً بعودتك ${existing.name}!`);
    } catch {
      showToast('⚠️ تعذّر الاتصال، جرّب تاني');
    } finally {
      btn.disabled = false; btn.textContent = loginMode ? 'دخول →' : 'ابدأ التسوق →';
    }
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

    const pin = (document.getElementById('reg-pin')?.value || '').trim();
    if (!phone || phone.length < 8) { flash('reg-phone', 'أدخل رقم هاتف صحيح'); return; }
    if (!/^[0-9]{4,8}$/.test(pin)) { flash('reg-pin', 'الرقم السري من 4 لـ 8 أرقام'); return; }

    if (loginMode) { await doLogin(phone, pin); return; }

    if (!name)  { flash('reg-name',  'أدخل اسمك الكامل'); return; }
    if (!areaId && !areaName) { showToast('⚠️ اختر منطقتك'); return; }

    const btn = document.getElementById('reg-submit');
    btn.disabled    = true;
    btn.textContent = '⏳ جاري التسجيل...';
    try {
      await API.registerCustomer({ name, shop_name: shop, phone, area_id: areaId, area_name: areaName, pin });
    } catch (err) {
      if (String(err?.message || err).includes('phone_exists')) {
        showToast('ℹ️ الرقم ده مسجّل عندنا، دخّل الرقم السري من "عندي حساب"');
        setMode(true);
        btn.disabled = false;
        return;
      }
      console.warn('[Register] save failed (non-critical):', err);
    }

    finishEntry(null, `🎉 أهلاً ${name}! يمكنك التسوق الآن`);
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

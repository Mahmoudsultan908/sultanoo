/**
 * Sultan Foods — Cart Page
 */

const CartPage = (() => {
  const render = () => {
    renderItems();
    Cart.onChange(() => {
      if (Router.getCurrentPage() === 'cart') renderItems();
    });
    // مطابقة هادئة مع المخزون الحيّ لحظة فتح السلة — لو صنف خلص وهو قاعد
    // في سلة عميل من زمان، يبان له على طول بدل ما يتفاجئ وقت الإرسال
    if (!Cart.isEmpty()) checkStockSilently();
    // لو قافل التطبيق تماماً وقت ما فشل الإرسال وفتحه تاني بعد ما النت
    // رجع، حدث 'online' مبيتسجّلش أصلاً (الصفحة اتقفلت) — فبنتأكد هنا كمان
    if (navigator.onLine && !Cart.isEmpty() && API.hasPendingOrderDraft(Cart.getItems())) {
      retryPendingOrder(API.getPendingOrderDraftNotes());
    }
  };

  const checkStockSilently = async () => {
    try {
      const fresh = await API.getProducts(true);
      const { changed, messages } = Cart.validateStock(fresh);
      if (changed) showToast(messages.join(' • '), 5000);
    } catch {}
  };

  const renderItems = () => {
    const listEl = document.getElementById('cart-list');
    const emptyEl = document.getElementById('cart-empty');
    const footerEl = document.getElementById('cart-footer');
    const totalEl = document.getElementById('cart-total');

    if (Cart.isEmpty()) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      footerEl.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    footerEl.classList.remove('hidden');

    listEl.innerHTML = Cart.getItems().map(item => `
      <div class="cart-item" id="cart-item-${item.id}">
        <img class="cart-item-img"
          src="${item.image_url || ''}"
          alt="${item.name_ar}"
          loading="lazy"
          onerror="this.src='';this.style.background='var(--gray-100)'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name_ar}</div>
          <div class="cart-item-unit">${item.unit}</div>
          <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} ج.م</div>
        </div>
        <div class="cart-item-actions">
          <button class="cart-item-delete" onclick="Cart.remove('${item.id}')">🗑️</button>
          <div class="qty-control">
            <button class="qty-btn" onclick="Cart.updateQty('${item.id}', ${item.quantity - 1})">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="Cart.updateQty('${item.id}', ${item.quantity + 1})">+</button>
          </div>
        </div>
      </div>
    `).join('');

    if (totalEl) totalEl.textContent = Cart.getTotal().toFixed(2);
  };

  const submitOrder = async () => {
    if (Cart.isEmpty()) { showToast('⚠️ السلة فارغة'); return; }

    // ── مطابقة أخيرة مع المخزون الحيّ قبل الإرسال مباشرة ──
    // ده الحارس الحقيقي: لو صنفين طلبوا نفس آخر قطعة في نفس الوقت تقريبًا،
    // الأول اللي يبعت طلبه يوخدها، والتاني هنا هيتوقف قبل الإرسال ويتعرض
    // له بالظبط إيه اللي اتغيّر، بدل ما يبعت طلب لصنف خلص من غير ما يعرف.
    const btnPre = document.getElementById('submit-order-btn');
    if (btnPre) { btnPre.disabled = true; btnPre.textContent = 'بنتأكد من توفر الأصناف...'; }
    try {
      const fresh = await API.getProducts(true);
      const { changed, messages } = Cart.validateStock(fresh);
      if (changed) {
        alert('⚠️ في تغيير حصل في المخزون وإحنا بنجهّز طلبك:\n\n' + messages.join('\n') + '\n\nراجع سلتك وابعت تاني.');
        return;
      }
    } catch {
      // فشل التحقق (مشكلة شبكة) — نكمل عادي بدل ما نمنع الإرسال بالكامل،
      // نفس فلسفة withCache: نسخة قديمة أحسن من فشل تام
    } finally {
      if (btnPre) { btnPre.disabled = false; btnPre.textContent = 'إرسال الطلب 📲'; }
    }
    if (Cart.isEmpty()) { showToast('⚠️ السلة فارغة بعد التحديث'); return; }

    // ── الحد الأدنى للطلب ──
    // Fix #3: يدعم المفتاحَين min_order_amount و minimum_order
    let liveSettings = API.getSettings();
    const hasMinSetting = liveSettings?.min_order_amount !== undefined
                       || liveSettings?.minimum_order   !== undefined;
    if (!liveSettings || !hasMinSetting) {
      try { liveSettings = await API.initSettings(); } catch {}
      liveSettings = liveSettings || API.getSettings() || {};
    }
    const minOrderVal = liveSettings?.min_order_amount ?? liveSettings?.minimum_order;
    let minAmount = Number(minOrderVal) || CONFIG.ORDER?.MIN_AMOUNT || 0;

    // لو منطقة العميل ليها حد أدنى خاص بيها (من "إدارة المناطق" في سلطان ERP)،
    // هو اللي بيتطبّق بدل الحد العام
    try {
      const customer = API.getCustomer();
      if (customer?.area_id) {
        const areas = await API.getAreas();
        const myArea = areas.find(a => a.id === customer.area_id);
        if (myArea?.min_order_amount > 0) minAmount = myArea.min_order_amount;
      }
    } catch {}

    if (minAmount > 0 && Cart.getTotal() < minAmount) {
      showToast(`⚠️ الحد الأدنى للطلب ${minAmount} ج.م — إجماليك الحالي ${Cart.getTotal().toFixed(0)} ج.م`);
      return;
    }

    const notes = document.getElementById('order-notes')?.value?.trim() || '';
    const btn = document.getElementById('submit-order-btn');

    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';

    try {
      const result = await API.submitOrder(Cart.getItems(), notes);
      // إرسال واتساب
      API.sendWhatsApp(result.orderData, result.itemsData);
      // مسح السلة
      Cart.clear();
      // عرض رسالة نجاح
      showOrderSuccess(result.orderId, result.total);
    } catch (e) {
      console.error('[Cart] submit error:', e);
      // ★ مهم: منمسحش السلة هنا — لو مسحناها والطلب فعلاً اتسجل في سلطان
      //   (بس الرد ضاع بسبب مشكلة نت)، العميل هيفتكر إنه اتبعت ومش هيبعت
      //   تاني، بينما احنا مش متأكدين. السلة بتفضل زي ما هي، وsubmitOrder
      //   بتستخدم نفس رقم الطلب في أي محاولة تانية (يدوية أو تلقائية)
      //   طول ما محتوى السلة نفسه، فمفيش خطر تكرار.
      showToast('📴 فشل الإرسال — هنحاول تلقائي أول ما النت يرجع، أو دوس "إرسال" تاني');
      armAutoRetry(notes);
    } finally {
      btn.disabled = false;
      btn.textContent = 'إرسال الطلب 📲';
    }
  };

  // محاولة فعلية لإعادة إرسال طلب فشل قبل كده — بتتنادى إما فورًا (لو
  // فتح صفحة السلة والنت موصول أصلاً) أو من armAutoRetry (لما حدث
  // 'online' يحصل بعدين وهو لسه في نفس الجلسة)
  const retryPendingOrder = async (notes) => {
    if (Cart.isEmpty() || !API.hasPendingOrderDraft(Cart.getItems())) return; // اتبعتت يدوي أو اتغيّرت السلة
    try {
      const result = await API.submitOrder(Cart.getItems(), notes);
      API.sendWhatsApp(result.orderData, result.itemsData);
      Cart.clear();
      showToast('✅ اتبعت طلبك اللي فشل قبل كده — رقم الطلب ' + result.orderId, 5000);
      // ★ العميل ممكن يكون مسّح صفحة السلة وقت ما النت رجع — منلمسش عناصرها
      //   إلا لو هي فعلاً الصفحة الظاهرة دلوقتي
      if (Router.getCurrentPage() === 'cart') showOrderSuccess(result.orderId, result.total);
    } catch (e) {
      console.error('[Cart] auto-retry failed:', e);
      armAutoRetry(notes); // لسه فيه مشكلة (مش بس النت) — استنى رجوع الاتصال تاني
    }
  };

  // محاولة تلقائية صامتة أول ما الاتصال يرجع — مرة واحدة لكل فشل، وبترجع
  // تسجّل نفسها تاني لو فشلت هي كمان (تغطية لتقطيع نت متكرر)
  let _autoRetryArmed = false;
  const armAutoRetry = (notes) => {
    if (_autoRetryArmed) return;
    _autoRetryArmed = true;
    window.addEventListener('online', function onOnline(){
      window.removeEventListener('online', onOnline);
      _autoRetryArmed = false;
      retryPendingOrder(notes);
    }, { once: true });
  };

  const showOrderSuccess = (orderId, total) => {
    const listEl   = document.getElementById('cart-list');
    const footerEl = document.getElementById('cart-footer');
    const emptyEl  = document.getElementById('cart-empty');
    emptyEl.classList.add('hidden');
    footerEl.classList.add('hidden');
    listEl.innerHTML = `
      <div class="order-success">
        <div class="success-anim">✅</div>
        <h2 class="success-title">تم إرسال طلبك!</h2>
        <p style="color:var(--gray-500);font-size:.875rem">سيتواصل معك فريقنا قريباً</p>
        <div class="success-order-num">رقم الطلب: ${orderId}</div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--green-main)">الإجمالي: ${total.toFixed(2)} ج.م</div>
        <button class="btn btn-primary btn-full" style="margin-top:1rem" onclick="navigateTo('home')">
          العودة للرئيسية 🏠
        </button>
        <button class="btn btn-ghost btn-full" onclick="CartPage.shareInvoice()">
          📤 مشاركة الفاتورة
        </button>
        <button class="btn btn-ghost btn-full" onclick="navigateTo('orders')">
          متابعة طلباتي 📋
        </button>
      </div>
    `;
  };

  const shareInvoice = () => {
    const order    = API.getLastOrder();
    const customer = API.getCustomer();
    if (!order) { showToast('⚠️ لا توجد بيانات للفاتورة'); return; }

    const date = new Date(order.created_at).toLocaleDateString('ar-EG',
      { year: 'numeric', month: 'short', day: 'numeric' });

    let text = `🧾 *فاتورة — سلطان للمواد الغذائية*\n`;
    text    += `━━━━━━━━━━━━━━\n`;
    text    += `🔖 ${order.id}\n`;
    text    += `📅 ${date}\n`;
    if (customer?.name)      text += `👤 ${customer.name}\n`;
    if (customer?.shop_name) text += `🏪 ${customer.shop_name}\n`;
    if (customer?.phone)     text += `📞 ${customer.phone}\n`;
    text    += `━━━━━━━━━━━━━━\n`;
    (order.items || []).forEach(i => {
      text += `• ${i.product_name}\n`;
      text += `  ${i.quantity} × ${Number(i.price).toFixed(2)} = ${Number(i.subtotal).toFixed(2)} ج.م\n`;
    });
    text    += `━━━━━━━━━━━━━━\n`;
    text    += `💰 *الإجمالي: ${Number(order.total_amount).toFixed(2)} ج.م*\n`;
    if (order.notes) text += `📝 ${order.notes}\n`;

    if (navigator.share) {
      navigator.share({ title: 'فاتورة طلب', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text)
        .then(() => showToast('✅ تم نسخ الفاتورة — الصقها في أي مكان'))
        .catch(() => showToast('⚠️ تعذّر النسخ'));
    }
  };

  const clearCart = () => {
    if (Cart.isEmpty()) return;
    if (!confirm('هل تريد مسح السلة بالكامل؟')) return;
    Cart.clear();
    showToast('🗑️ تم مسح السلة');
  };

  return { render, submitOrder, clearCart, shareInvoice };
})();

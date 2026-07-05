/**
 * Sultan Foods — Orders Page
 */

const OrdersPage = (() => {
  let activeTab = 'active';

  const render = () => {
    showTab(activeTab);
  };

  const showTab = (tab) => {
    activeTab = tab;
    document.querySelectorAll('.orders-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    if (tab === 'active') renderActiveOrders();
    else renderHistoryOrders();
  };

  const STATUS = CONFIG.ORDER_STATUS;

  const getStatusInfo = (key) => STATUS[key.toUpperCase()] || STATUS.NEW;

  const renderOrderCard = (order) => {
    const status = getStatusInfo(order.status);
    const date = order.created_at
      ? new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';

    const steps = ['NEW','REVIEWING','PREPARING','DELIVERING','DELIVERED'];
    const currentIdx = steps.findIndex(s => s === order.status.toUpperCase());
    const items = order.items || [];
    const itemsPreview = items.slice(0, 3).map(i => `${i.product_name} ×${i.quantity}`).join(' • ');
    const isActive = !['delivered','cancelled'].includes(order.status);

    return `
      <div class="order-card" id="order-card-${order.id}">
        <div class="order-card-header">
          <span class="order-id">🔖 ${order.id}</span>
          <span class="order-status-badge" style="background:${status.color}20;color:${status.color}">
            ${status.icon} ${status.label}
          </span>
        </div>

        ${(order.customer_name || order.customer_phone) ? `
        <div style="font-size:.8rem;color:var(--gray-500);margin:.25rem 0;display:flex;gap:1rem">
          ${order.customer_name  ? `<span>👤 ${order.customer_name}</span>`  : ''}
          ${order.customer_phone ? `<span>📞 ${order.customer_phone}</span>` : ''}
        </div>` : ''}

        ${date ? `<div class="order-date">📅 ${date}</div>` : ''}
        ${itemsPreview ? `<div class="order-items-preview">${itemsPreview}</div>` : ''}
        <div class="order-total">💰 ${Number(order.total_amount).toFixed(2)} ج.م</div>

        <div class="status-timeline">
          ${steps.map((s, i) => {
            const st = getStatusInfo(s);
            const isDone    = i < currentIdx;
            const isCurrent = i === currentIdx;
            return `<div class="status-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
              <div class="status-dot">${isDone ? '✓' : st.icon}</div>
              <span class="step-label">${st.label}</span>
            </div>`;
          }).join('')}
        </div>

        <div style="display:flex;gap:.5rem;margin-top:.5rem">
          ${isActive ? `
          <button class="btn btn-ghost btn-sm" style="flex:1"
            onclick="OrdersPage.refreshStatus('${order.id}')">
            🔄 تحديث الحالة
          </button>` : ''}
          ${items.length ? `
          <button class="btn btn-ghost btn-sm" style="flex:1"
            onclick="OrdersPage.reorder('${order.id}')">
            📋 إعادة الطلب
          </button>` : ''}
        </div>
      </div>
    `;
  };

  const renderActiveOrders = () => {
    const el = document.getElementById('orders-list');
    if (!el) return;

    const history = API.getOrdersHistory();
    const active = history.filter(o =>
      !['delivered','cancelled'].includes(o.status)
    );

    if (!active.length) {
      el.innerHTML = `<div class="empty-state">
        <span class="empty-icon">📋</span>
        <h3>لا توجد طلبات نشطة</h3>
        <p>طلباتك الجارية ستظهر هنا</p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('home')">ابدأ التسوق</button>
      </div>`;
      return;
    }

    el.innerHTML = active.map(renderOrderCard).join('');
  };

  const renderHistoryOrders = () => {
    const el = document.getElementById('orders-list');
    if (!el) return;

    const history = API.getOrdersHistory();

    if (!history.length) {
      el.innerHTML = `<div class="empty-state">
        <span class="empty-icon">📦</span>
        <h3>لا يوجد سجل طلبات</h3>
        <p>طلباتك السابقة ستظهر هنا</p>
      </div>`;
      return;
    }

    el.innerHTML = history.map(renderOrderCard).join('');
  };

  const reorder = (orderId) => {
    const history = API.getOrdersHistory();
    const order = history.find(o => o.id === orderId);
    if (!order || !order.items?.length) {
      showToast('⚠️ لا يمكن إعادة هذا الطلب');
      return;
    }

    order.items.forEach(item => {
      Cart.add({
        id: item.product_id,
        name_ar: item.product_name,
        unit: item.unit,
        price: item.price,
        image_url: '',
      }, item.quantity);
    });

    navigateTo('cart');
    showToast(`✅ تم إضافة ${order.items.length} صنف للسلة`);
  };

  const refreshStatus = async (orderId) => {
    const customer = API.getCustomer();
    if (!customer) return;
    showToast('⏳ جاري التحديث...');
    try {
      const serverOrders = await SheetsProvider.getOrders(customer.id);
      const updated = serverOrders.find(o => o.id === orderId);
      if (!updated) { showToast('⚠️ الطلب غير موجود'); return; }

      // تحديث التخزين المحلي
      const history = API.getOrdersHistory();
      const idx = history.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        history[idx] = { ...history[idx], status: updated.status };
        Storage.set(Storage.KEYS.ORDERS_HISTORY, history);
      }

      // إعادة رسم الكارت فقط
      const card = document.getElementById(`order-card-${orderId}`);
      if (card) {
        const fullOrder = idx !== -1 ? history[idx] : updated;
        card.outerHTML = renderOrderCard(fullOrder);
      }
      showToast('✅ تم التحديث');
    } catch {
      showToast('⚠️ تعذّر التحديث، تحقق من الإنترنت');
    }
  };

  return { render, showTab, reorder, refreshStatus };
})();

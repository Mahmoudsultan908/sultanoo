/**
 * Sultan Foods — Cart Business Logic
 * =====================================
 * كل منطق السلة هنا — لا يوجد منطق في UI
 */

const Cart = (() => {
  let items = [];
  const listeners = [];

  const notify = () => {
    Storage.set(Storage.KEYS.CART, items);
    listeners.forEach(fn => fn(items));
    updateCartBadge();
  };

  const updateCartBadge = () => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    // شارة العدد في الهيدر والناف بار
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    // عداد الكميات في صفحة السلة
    const countEl = document.getElementById('cart-items-count');
    if (countEl) countEl.textContent = count;

    // الإجمالي المباشر بجانب أيقونة السلة
    const totalEl = document.getElementById('cart-total-live');
    if (totalEl) {
      totalEl.textContent = count > 0 ? `${total.toFixed(0)} ج.م` : '';
      totalEl.style.display = count > 0 ? 'inline' : 'none';
    }
  };

  const init = () => {
    items = Storage.get(Storage.KEYS.CART) || [];
    updateCartBadge();
  };

  const add = (product, quantity = 1) => {
    const minQty = parseInt(product.min_qty) || 1;
    const maxQty = parseInt(product.max_qty) || 999;
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > maxQty) {
        showToast(`⚠️ الحد الأقصى للطلب ${maxQty} ${product.unit}`);
        return;
      }
      existing.quantity = newQty;
    } else {
      items.push({
        id:        product.id,
        name_ar:   product.name_ar,
        unit:      product.unit,
        price:     product.price,
        image_url: product.image_url,
        min_qty:   minQty,
        max_qty:   maxQty,
        quantity:  Math.max(quantity, minQty),
      });
    }
    notify();
    showToast(`✅ تمت الإضافة: ${product.name_ar}`);
  };

  const remove = (productId) => {
    items = items.filter(i => i.id !== productId);
    notify();
  };

  const updateQty = (productId, quantity) => {
    if (quantity <= 0) { remove(productId); return; }
    const item = items.find(i => i.id === productId);
    if (!item) return;
    const minQty = item.min_qty || 1;
    const maxQty = item.max_qty || 999;
    if (quantity < minQty) {
      showToast(`⚠️ الحد الأدنى ${minQty} ${item.unit}`);
      item.quantity = minQty;
      notify();
      return;
    }
    if (quantity > maxQty) {
      showToast(`⚠️ الحد الأقصى ${maxQty} ${item.unit}`);
      return;
    }
    item.quantity = quantity;
    notify();
  };

  const getQty = (productId) => {
    return items.find(i => i.id === productId)?.quantity || 0;
  };

  const clear = () => { items = []; notify(); };

  const getItems = () => [...items];

  const getTotal = () => items.reduce((s, i) => s + i.price * i.quantity, 0);

  const getCount = () => items.reduce((s, i) => s + i.quantity, 0);

  const isEmpty = () => items.length === 0;

  const loadLastOrder = () => {
    const last = API.getLastOrder();
    if (!last || !last.items?.length) {
      showToast('⚠️ لا يوجد طلب سابق');
      return;
    }
    items = last.items.map(i => ({
      id:        i.product_id,
      name_ar:   i.product_name,
      unit:      i.unit,
      price:     i.price,
      image_url: '',
      quantity:  i.quantity,
    }));
    notify();
    showToast(`✅ تم تحميل ${items.length} صنف من آخر طلبية`);
  };

  const onChange = (fn) => listeners.push(fn);

  return {
    init, add, remove, updateQty, getQty,
    clear, getItems, getTotal, getCount, isEmpty,
    loadLastOrder, onChange,
  };
})();

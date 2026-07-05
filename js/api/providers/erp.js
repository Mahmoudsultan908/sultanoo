/**
 * Sultan Foods — ERP Provider (جاهز للمستقبل)
 * ===============================================
 * هذا الملف فارغ حالياً.
 * عندما يكون ERP جاهزاً، نملأ هذا الملف فقط
 * ولا نلمس أي ملف آخر في المشروع.
 *
 * قم بتغيير: CONFIG.DATA_PROVIDER = 'erp'
 */

const ERPProvider = (() => {
  const { BASE_URL, API_KEY, VERSION } = CONFIG.ERP;

  const request = async (endpoint, options = {}) => {
    const url = `${BASE_URL}/${VERSION}/${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`ERP request failed: ${res.status}`);
    return res.json();
  };

  return {
    async getProducts()               { return request('products'); },
    async getCategories()             { return request('categories'); },
    async getAreas()                  { return request('areas'); },
    async submitOrder(order, items)   { return request('orders', { method: 'POST', body: JSON.stringify({ order, items }) }); },
    async registerCustomer(data)      { return request('customers', { method: 'POST', body: JSON.stringify(data) }); },
    async getOrders(customerId)       { return request(`customers/${customerId}/orders`); },
    async getOrderStatus(orderId)     { return request(`orders/${orderId}/status`); },
    async getCustomerAccount(id)      { return request(`customers/${id}/account`); },
  };
})();

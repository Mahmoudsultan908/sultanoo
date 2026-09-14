/**
 * Sultan Foods — Event Bus
 * ==========================
 * نظام أحداث مركزي لتواصل المكوّنات بدون coupling
 */

const EventBus = (() => {
  const handlers = {};

  const on = (event, fn) => {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(fn);
    return () => off(event, fn); // returns unsubscribe function
  };

  const off = (event, fn) => {
    if (handlers[event]) {
      handlers[event] = handlers[event].filter(h => h !== fn);
    }
  };

  const emit = (event, data) => {
    (handlers[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[EventBus] ${event}:`, e); }
    });
  };

  const EVENTS = {
    NAVIGATE:      'navigate',
    CART_UPDATED:  'cart:updated',
    FAV_UPDATED:   'favorites:updated',
    ORDER_SENT:    'order:sent',
    DATA_LOADED:   'data:loaded',
    LOADING_START: 'loading:start',
    LOADING_END:   'loading:end',
  };

  return { on, off, emit, EVENTS };
})();

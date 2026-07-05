/**
 * Sultan Foods — Configuration v2
 */

const CONFIG = {
  APP: {
    name_ar: 'سلطان للمواد الغذائية',
    name_en: 'Sultan Foodstuffs',
    version: '2.0.1',
  },

  DATA_PROVIDER: 'sheets',

  SHEETS: {
    SPREADSHEET_ID:  '1Tpg2lLTB-K5tAtwS2Emtk5SpvJgdh1CAXIHlyhoPqtw',
    API_KEY:         'AIzaSyA2kVZLEZh1qelWgl330wX3PqajLrOtYuc',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzbMADYIZJxbXjc-gjuHDp6NqBKWZGEbyBRWbHQhgzbV8Y0pnbfUPmeLXfDI4hzsZM4Eg/exec',
    BASE_URL:        'https://sheets.googleapis.com/v4/spreadsheets',
    SHEETS: {
      PRODUCTS:    'Products',
      CATEGORIES:  'Categories',
      CUSTOMERS:   'Customers',
      ORDERS:      'Orders',
      ORDER_ITEMS: 'OrderItems',
      AREAS:       'Areas',
    },
  },

  ERP: {
    BASE_URL: '',
    API_KEY:  '',
    VERSION:  'v1',
  },

  WHATSAPP: {
    NUMBER: '201284579261',
    get URL() { return `https://wa.me/${this.NUMBER}`; },
  },

  CACHE: {
    TTL_PRODUCTS:   5  * 60 * 1000,
    TTL_CATEGORIES: 5  * 60 * 1000,
    TTL_AREAS:      5  * 60 * 1000,
  },

  UI: {
    SPLASH_DURATION: 2200,
    ITEMS_PER_PAGE:  24,
    SEARCH_DEBOUNCE: 350,
  },

  ORDER: {
    MIN_AMOUNT: 0,          // الحد الأدنى للطلب بالجنيه — 0 = بدون حد
  },

  ORDER_STATUS: {
    NEW:        { key: 'new',        label: 'طلب جديد',      icon: '🆕', color: '#3B82F6' },
    REVIEWING:  { key: 'reviewing',  label: 'قيد المراجعة',   icon: '🔍', color: '#F59E0B' },
    PREPARING:  { key: 'preparing',  label: 'جاري التحضير',   icon: '📦', color: '#8B5CF6' },
    DELIVERING: { key: 'delivering', label: 'خرج للتسليم',    icon: '🚚', color: '#06B6D4' },
    DELIVERED:  { key: 'delivered',  label: 'تم التسليم',     icon: '✅', color: '#10B981' },
    CANCELLED:  { key: 'cancelled',  label: 'ملغي',           icon: '❌', color: '#EF4444' },
  },
};

Object.freeze(CONFIG);

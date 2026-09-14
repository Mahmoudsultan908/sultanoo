/**
 * Sultan Foods — Configuration v2
 */

const CONFIG = {
  APP: {
    name_ar: 'سلطان للمواد الغذائية',
    name_en: 'Sultan Foodstuffs',
    version: '2.1.0-erp',
  },

  DATA_PROVIDER: 'erp',

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

  PUSH: {
    // مفتاح VAPID العام — آمن يتحط هنا في كود العميل (مقابله المفتاح
    // الخاص محفوظ سرّي كـ secret في Edge Function send-push-notification
    // على Supabase، مش هنا)
    VAPID_PUBLIC_KEY: 'BKC7z9w6EBPKJP6Ks0UkyWu-ttozmEo76fM0377tPj9c3iFBIRsBbKd3w_nRQq_1oI4sZmZjB8TLsb6pEymj-sk',
  },

  // كانت 5 دقايق للتلاتة — الكتالوج كامل بيتحسبله سعر كل عميل من جديد في
  // نداء واحد ضخم، فكان بيتكرر لو العميل قاعد يتسوق أكتر من 5 دقايق. مفيش
  // خطر من تكبيرها: زرار "تحديث المنتجات والأسعار" في صفحة حسابي بيمسح
  // الكاش يدويًا وقت ما يحتاجه العميل فعلاً (ProfilePage.refreshData)
  CACHE: {
    TTL_PRODUCTS:   20 * 60 * 1000,
    TTL_CATEGORIES: 30 * 60 * 1000,
    TTL_AREAS:      30 * 60 * 1000,
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

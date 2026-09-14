/**
 * Sultan Foods — SPA Router
 * ==========================
 * Hash-based router للتنقل بين الصفحات
 */

const Router = (() => {
  const routes = {};
  let currentPage = null;
  let previousPage = null;

  // ─── مكدس التنقل لزر الرجوع ────────────────────────────────────
  const navStack = [];

  const register = (name, handlerFn) => {
    routes[name] = handlerFn;
  };

  // تطبيق الانتقال على DOM — دون تعديل المكدس
  const _apply = (page, params) => {
    previousPage = currentPage;
    currentPage  = page;
    State.set({ currentPage: page });

    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.remove('active');
    });

    const pageEl = document.querySelector(`[data-page="${page}"]`);
    if (pageEl) {
      pageEl.classList.add('active');
      pageEl.scrollTop = 0;
    }

    if (routes[page]) routes[page](params);
    updateNav(page);
    window.scrollTo(0, 0);
  };

  const navigate = (page, params = {}) => {
    // الرئيسية تُعيد ضبط المكدس
    if (page === 'home') navStack.length = 0;
    navStack.push({ page, params });
    _apply(page, params);
  };

  // هل يوجد صفحة سابقة للرجوع إليها؟
  const canGoBack = () => navStack.length > 1;

  // رجوع عبر المكدس الداخلي — لا يُضيف للمكدس
  const goBack = () => {
    navStack.pop();
    const prev = navStack[navStack.length - 1] || { page: 'home', params: {} };
    _apply(prev.page, prev.params);
  };

  const back = () => {
    if (previousPage) navigate(previousPage);
    else navigate('home');
  };

  const updateNav = (page) => {
    document.querySelectorAll('[data-nav-item]').forEach(el => {
      el.classList.toggle('active', el.dataset.navItem === page);
    });
  };

  const getCurrentPage = () => currentPage;

  return { register, navigate, back, goBack, canGoBack, getCurrentPage };
})();

// اختصار عالمي
const navigateTo = (page, params) => Router.navigate(page, params);

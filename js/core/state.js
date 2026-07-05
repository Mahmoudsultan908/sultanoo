/**
 * Sultan Foods — Global State
 * ============================
 * حالة التطبيق المركزية — بدون Framework
 */

const State = (() => {
  let state = {
    currentPage: 'home',
    currentCategory: null,
    currentProduct: null,
    searchQuery: '',
    products: [],
    categories: [],
    areas: [],
    isLoading: false,
    dataLoaded: false,
  };

  const get = (key) => key ? state[key] : { ...state };

  const set = (updates) => {
    state = { ...state, ...updates };
  };

  return { get, set };
})();

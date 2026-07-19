/**
 * Sultan Foods — Home Page
 */

const HomePage = (() => {
  let initialized = false;

  const render = async () => {
    if (!initialized) {
      bindSearch();
      initialized = true;
    }
    await loadSections();
  };

  const loadSections = async () => {
    renderSkeletons();
    try {
      const [featuredR, bestsellersR, categoriesR, bannersR] = await Promise.allSettled([
        API.getFeatured(),
        API.getBestsellers(),
        API.getMainCategories(),
        API.getBanners(),
      ]);
      const featured    = featuredR.status    === 'fulfilled' ? featuredR.value    : [];
      const bestsellers = bestsellersR.status === 'fulfilled' ? bestsellersR.value : [];
      const categories  = categoriesR.status  === 'fulfilled' ? categoriesR.value  : [];
      const banners     = bannersR.status     === 'fulfilled' ? bannersR.value     : [];

      renderBanners(banners);
      renderFeatured(featured);
      renderBestsellers(bestsellers);

      // الأقسام هي الأهم — لو هي فشلت فعلاً (مفيش كاش قديم ولا جديد) وريها رسالة الخطأ
      if (categoriesR.status === 'fulfilled') {
        renderCategories(categories);
      } else {
        throw categoriesR.reason;
      }
    } catch (e) {
      console.error('[Home] load error:', e);
      const el = document.getElementById('home-categories');
      if (el) el.innerHTML = `
        <div style="text-align:center;padding:2rem;grid-column:1/-1">
          <div style="font-size:2.5rem;margin-bottom:.5rem">⚠️</div>
          <p style="color:var(--gray-500);margin:.25rem 0 1rem">تعذّر تحميل البيانات</p>
          <button class="btn btn-primary" onclick="HomePage.retry()" style="padding:.5rem 1.5rem">🔄 إعادة المحاولة</button>
        </div>`;
      const featEl = document.getElementById('home-featured');
      if (featEl) featEl.closest('.section-wrap')?.classList.add('hidden');
    }
  };

  const renderBanners = (banners) => {
    const el = document.getElementById('home-banners');
    if (!el || !banners.length) { if (el) el.style.display = 'none'; return; }
    el.style.display = 'block';
    let current = 0;

    el.innerHTML = `
      <div style="position:relative;overflow:hidden;border-radius:14px;margin:0 1rem 1rem">
        ${banners.map((b, i) => `
          <div class="banner-slide" data-slide="${i}"
            style="display:${i===0?'flex':'none'};align-items:center;min-height:110px;
                   padding:1.1rem 1.25rem;background:${b.bg_color || '#1a4731'};
                   border-radius:14px;gap:1rem;${b.link_to ? 'cursor:pointer' : ''}"
            ${b.link_to ? `onclick="navigateTo('category', {id:'${b.link_to}'})"` : ''}>
            <div style="flex:1;min-width:0">
              <div style="font-size:1rem;font-weight:800;color:#fff;line-height:1.3">${b.title}</div>
              ${b.subtitle ? `<div style="font-size:.78rem;color:rgba(255,255,255,.82);margin-top:.3rem">${b.subtitle}</div>` : ''}
            </div>
            ${b.image_url
              ? `<img src="${b.image_url}" alt="${b.title}"
                   style="height:80px;width:80px;object-fit:contain;border-radius:8px;flex-shrink:0"
                   loading="lazy" onerror="this.style.display='none'">`
              : ''}
          </div>`).join('')}
        ${banners.length > 1 ? `
          <div style="position:absolute;bottom:7px;left:50%;transform:translateX(-50%);
                      display:flex;gap:5px;pointer-events:none" id="banner-dots">
            ${banners.map((_, i) => `
              <div id="bdot-${i}" style="width:${i===0?'18':'6'}px;height:6px;border-radius:3px;
                background:${i===0?'#fff':'rgba(255,255,255,.4)'};transition:all .3s"></div>`).join('')}
          </div>` : ''}
      </div>`;

    if (banners.length > 1) {
      setInterval(() => {
        const slides = el.querySelectorAll('.banner-slide');
        const prevDot = document.getElementById(`bdot-${current}`);
        if (prevDot) { prevDot.style.width = '6px'; prevDot.style.background = 'rgba(255,255,255,.4)'; }
        slides[current].style.display = 'none';
        current = (current + 1) % banners.length;
        slides[current].style.display = 'flex';
        const nextDot = document.getElementById(`bdot-${current}`);
        if (nextDot) { nextDot.style.width = '18px'; nextDot.style.background = '#fff'; }
      }, 4000);
    }
  };

  const retry = () => { initialized = false; loadSections(); };

  const renderSkeletons = () => {
    const featEl = document.getElementById('home-featured');
    if (featEl) featEl.innerHTML = Array(4).fill(`<div class="skeleton" style="width:200px;height:180px;border-radius:var(--radius-lg);flex-shrink:0"></div>`).join('');
  };

  const renderFeatured = (products) => {
    const el = document.getElementById('home-featured');
    if (!el) return;
    if (!products.length) { el.closest('.section-wrap')?.classList.add('hidden'); return; }
    el.innerHTML = products.slice(0, 8).map(p => `
      <div class="featured-card" onclick="navigateTo('product', {id:'${p.id}'})">
        <img src="${p.image_url || ''}" alt="${p.name_ar}" class="feat-img"
          onerror="this.src=''; this.parentElement.querySelector('.img-ph').style.display='flex'"
          loading="lazy">
        <div class="img-ph" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;font-size:2rem;background:rgba(255,255,255,0.05)">🛒</div>
        <div class="feat-info">
          <div class="feat-name">${p.name_ar}</div>
          <div class="feat-price">${p.price.toFixed(2)} <span style="font-size:.7rem">ج.م</span></div>
        </div>
        <button class="feat-add" onclick="event.stopPropagation(); Cart.add(${JSON.stringify(p).replace(/"/g, '&quot;')})">+</button>
      </div>
    `).join('');
  };

  const renderBestsellers = (products) => {
    const el = document.getElementById('home-bestsellers');
    if (!el) return;
    if (!products.length) { el.closest('.section-wrap')?.classList.add('hidden'); return; }
    el.innerHTML = products.slice(0, 10).map(p => renderProductCard(p)).join('');
    el.className = 'scroll-row';
    el.querySelectorAll('.product-card').forEach(c => {
      c.style.width = '160px';
      c.style.flexShrink = '0';
    });
  };

  const renderCategories = (categories) => {
    const el = document.getElementById('home-categories');
    if (!el) return;
    if (!categories.length) return;
    el.innerHTML = categories.map(c => `
      <div class="cat-card" onclick="navigateTo('category', {id:'${c.id}', name:'${c.name_ar}'})">
        <div class="cat-img-wrap">
          ${c.image_url
            ? `<img src="${c.image_url}" alt="${c.name_ar}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <span class="cat-icon" style="${c.image_url ? 'display:none' : ''}">${c.icon}</span>
        </div>
        <span class="cat-name">${c.name_ar}</span>
      </div>
    `).join('');
  };

  const bindSearch = () => {
    const input = document.getElementById('home-search-input');
    if (!input) return;
    let timer;
    input.addEventListener('input', (e) => {
      clearTimeout(timer);
      const q = e.target.value.trim();
      if (q.length >= 2) {
        timer = setTimeout(() => {
          State.set({ searchQuery: q });
          navigateTo('search', { query: q });
        }, CONFIG.UI.SEARCH_DEBOUNCE);
      }
    });

    input.addEventListener('focus', () => navigateTo('search'));
  };

  return { render, retry };
})();

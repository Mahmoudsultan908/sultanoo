/**
 * Sultan Foods — Push Notifications
 * ======================================
 * تفعيل/إلغاء إشعارات Web Push حقيقية (زي إشعارات فيسبوك على الموبايل)
 * — مش واتساب ومش SMS، إشعار من المتصفح نفسه حتى لو التطبيق مقفول.
 * الإرسال الفعلي بيحصل من سلطان ERP عبر Edge Function، الملف ده بس
 * بيسجّل "عنوان" الجهاز (Push Subscription) مرتبط برقم العميل.
 */

const Push = (() => {
  const isSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // Web Push محتاج المفتاح العام كـ Uint8Array مش base64 نص عادي
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  };

  // 'unsupported' | 'denied' | 'subscribed' | 'not-subscribed'
  const getStatus = async () => {
    if (!isSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return sub ? 'subscribed' : 'not-subscribed';
    } catch {
      return 'not-subscribed';
    }
  };

  const subscribe = async () => {
    if (!isSupported()) throw new Error('المتصفح ده مش بيدعم الإشعارات');
    const customer = API.getCustomer();
    if (!customer?.id) throw new Error('لازم تكون مسجّل عشان تفعّل الإشعارات');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('لازم توافق على إذن الإشعارات من المتصفح');

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.PUSH.VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    await API.savePushSubscription({
      customer_id: customer.id,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    });
    return true;
  };

  const unsubscribe = async () => {
    if (!isSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await API.removePushSubscription(sub.endpoint).catch(() => {});
      await sub.unsubscribe();
    }
  };

  // ── طلب تفعيل ودّي بعد التسجيل مباشرة (بوتوم شيت مخصّص، مش نداء متصفح
  //    مفاجئ) — لازم يتحط جوه ضغطة مستخدم (زرار "تفعيل") عشان requestPermission
  //    يشتغل صح على كل المتصفحات ────────────────────────────────────
  const showPrompt = () => {
    if (!isSupported() || document.getElementById('push-prompt-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'overlay active';
    overlay.id = 'push-prompt-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet" style="text-align:center">
        <div style="font-size:2.5rem;margin-bottom:.5rem">🔔</div>
        <h3 style="margin-bottom:.5rem">فعّل الإشعارات؟</h3>
        <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:1.25rem">عشان توصلك عروضنا وتحديثات طلباتك أول بأول</p>
        <button class="btn btn-primary btn-full" id="push-prompt-yes" style="margin-bottom:.5rem">🔔 تفعيل الإشعارات</button>
        <button class="btn btn-ghost btn-full" id="push-prompt-later">لاحقاً</button>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('push-prompt-yes').onclick = async () => {
      overlay.remove();
      try { await subscribe(); showToast('✅ تم تفعيل الإشعارات'); }
      catch (e) { showToast('⚠️ ' + e.message); }
    };
    document.getElementById('push-prompt-later').onclick = () => overlay.remove();
  };

  // ── بانر تفعيل خفيف في الصفحة الرئيسية لأي عميل لسه ما فعّلش —
  //    قابل للإغلاق، وبيرجع يظهر تاني بعد 3 أيام لو لسه مش مفعّل
  //    (مش كل زيارة عشان ميبقاش مزعج) ─────────────────────────────
  const HOME_BANNER_DISMISS_KEY = 'sultan_push_banner_dismissed_at';
  const HOME_BANNER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

  const renderHomeBanner = async () => {
    const el = document.getElementById('home-notify-banner');
    if (!el) return;
    const status = await getStatus();
    if (status !== 'not-subscribed') { el.innerHTML = ''; return; }
    const dismissedAt = Storage.get(HOME_BANNER_DISMISS_KEY);
    if (dismissedAt && (Date.now() - dismissedAt) < HOME_BANNER_COOLDOWN_MS) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <div style="margin:0 1rem 1rem;padding:.75rem 1rem;border-radius:12px;background:var(--green-light,#eafbf3);
                  display:flex;align-items:center;gap:.6rem" id="push-home-banner-inner">
        <span style="font-size:1.4rem">🔔</span>
        <span style="flex:1;font-size:.82rem;color:var(--gray-700,#374151)">فعّل الإشعارات عشان توصلك عروضنا</span>
        <button class="btn btn-primary btn-sm" id="push-home-banner-yes">تفعيل</button>
        <button id="push-home-banner-close" style="background:none;border:none;font-size:1.1rem;color:var(--gray-400);cursor:pointer;padding:0 .25rem">✕</button>
      </div>`;
    document.getElementById('push-home-banner-yes').onclick = async () => {
      try { await subscribe(); showToast('✅ تم تفعيل الإشعارات'); el.innerHTML = ''; }
      catch (e) { showToast('⚠️ ' + e.message); }
    };
    document.getElementById('push-home-banner-close').onclick = () => {
      Storage.set(HOME_BANNER_DISMISS_KEY, Date.now());
      el.innerHTML = '';
    };
  };

  return { isSupported, getStatus, subscribe, unsubscribe, showPrompt, renderHomeBanner };
})();

window.Push = Push;

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

  return { isSupported, getStatus, subscribe, unsubscribe };
})();

window.Push = Push;

/**
 * Sultan Foods — Voice Search
 * ======================================
 * بحث بالصوت باستخدام Web Speech API المدمجة في المتصفح — مجانية بالكامل،
 * مفيش مفتاح API ولا سيرفر خارجي. مدعومة في Chrome على أندرويد (جهاز أغلب
 * عملاء سلطانو الحقيقيين). لو المتصفح مش داعمها، الزرار بيتخفي تلقائيًا
 * (نفس فلسفة Push.isSupported).
 */

const VoiceSearch = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = () => !!SR;

  let recognition = null;
  let listening = false;

  // onResult(text) لما يسمع كلام، onEnd(errorOrNull) لما يخلص (نجح أو فشل)
  const start = (onResult, onEnd) => {
    if (!SR || listening) return;
    recognition = new SR();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    listening = true;

    recognition.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) onResult(text);
    };
    recognition.onerror = (e) => {
      listening = false;
      onEnd?.(e.error || 'error');
    };
    recognition.onend = () => {
      listening = false;
      onEnd?.(null);
    };

    try { recognition.start(); }
    catch { listening = false; onEnd?.('start-failed'); }
  };

  const stop = () => { if (recognition && listening) recognition.stop(); };
  const isListening = () => listening;

  // رسالة عربية مفهومة بدل كود الخطأ الإنجليزي الخام
  const errorMessage = (err) => ({
    'not-allowed':  '🎤 محتاجين إذن الميكروفون عشان نسمعك',
    'no-speech':    '🎤 معرفناش نسمع حاجة، جرب تاني',
    'audio-capture': '🎤 مفيش ميكروفون شغال على الجهاز',
    'network':      '📴 مشكلة في الاتصال أثناء البحث الصوتي',
  }[err] || (err ? '🎤 حصل خطأ في البحث الصوتي' : null));

  return { isSupported, start, stop, isListening, errorMessage };
})();

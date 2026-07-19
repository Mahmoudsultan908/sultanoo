/**
 * Sultan Foods — Supabase Client (ERP Provider dependency)
 * نفس المشروع اللي سلطان ERP نفسه بيتكلم معاه — نفس الرابط والمفتاح
 * العام (anon/publishable). الحماية عن طريق RLS مش سرّية المفتاح.
 */
const sb = supabase.createClient(
  'https://fanaozxqlodzfdgstwaz.supabase.co',
  'sb_publishable_xt2yyOGAwKhFRlR6WM9a8Q_T9UOXPBi'
);

#!/usr/bin/env node
/* فحوصات آلية لتطبيق سلطانو (GitHub Actions + محلياً: node scripts/ci-check.js)
   1) syntax لكل ملفات JS  2) كل سكربت/ملف في index.html وsw.js موجود  3) أسرار مكشوفة (service_role...)
   4) (لو BASE_REF) ملف من ملفات الكاش اتعدّل من غير ما STATIC_CACHE في sw.js يتغيّر */
const fs = require('fs'), path = require('path'), vm = require('vm'), { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const errors = []; const fail = (m) => errors.push(m);

const walk = (dir, accept, out = []) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        if (['node_modules', '.git'].includes(e.name)) continue;
        const rel = dir ? path.posix.join(dir, e.name) : e.name;
        if (e.isDirectory()) walk(rel, accept, out); else if (accept(rel)) out.push(rel);
    }
    return out;
};

const jsFiles = walk('', (f) => f.endsWith('.js'));
for (const f of jsFiles) { try { new vm.Script(read(f), { filename: f }); } catch (e) { fail(`خطأ كتابة في ${f}: ${e.message}`); } }

const html = read('index.html'), sw = read('sw.js');
const local = (p) => p && !/^(https?:)?\/\//.test(p) && !p.startsWith('data:') && !p.startsWith('#');
for (const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    if (local(m[1]) && !m[1].startsWith('javascript:') && m[1] !== './' && !fs.existsSync(path.join(root, m[1]))) fail(`index.html بيشاور على ملف مش موجود: ${m[1]}`);
}
const assetsBlock = (sw.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || '';
const assets = [...assetsBlock.matchAll(/'([^']+)'/g)].map(m => m[1]).filter(local).map(p => p.replace(/^\.\//, ''));
for (const a of assets) if (a && a !== '' && !fs.existsSync(path.join(root, a))) fail(`sw.js بيعدّد ملف مش موجود: ${a}`);

for (const f of walk('', (f) => /\.(js|html|css|json|md|yml)$/i.test(f))) {
    const t = read(f);
    for (const m of t.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
        try { if (JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role === 'service_role') fail(`مفتاح service_role ظاهر في ${f}`); } catch { /* مش JWT */ }
    }
    if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(t)) fail(`مفتاح سري (sb_secret_) ظاهر في ${f}`);
}

const base = process.env.BASE_REF;
if (base) {
    let changed = [];
    try { changed = execSync(`git diff --name-only ${base}...HEAD`, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); } catch { console.log('(تعذّر مقارنة الفرع الأساسي)'); }
    const cached = changed.filter(f => assets.includes(f) && f !== 'sw.js');
    if (cached.length) {
        let oldSw = ''; try { oldSw = execSync(`git show ${base}:sw.js`, { cwd: root, encoding: 'utf8' }); } catch { /* */ }
        const cacheOf = (s) => (s.match(/STATIC_CACHE\s*=\s*'([^']+)'/) || [])[1];
        if (oldSw && cacheOf(oldSw) === cacheOf(sw)) fail(`ملفات اتعدّلت (${cached.slice(0, 3).join(', ')}...) لكن STATIC_CACHE في sw.js لسه ${cacheOf(sw)} — ارفعه`);
    }
}

if (errors.length) { console.error('❌ فشلت الفحوصات:\n' + errors.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log(`✅ كل الفحوصات نجحت (${jsFiles.length} ملف JS، ${assets.length} ملف في كاش sw.js)`);

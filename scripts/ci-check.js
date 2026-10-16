// Checks for the published Sultanoo site (built from the company's main project, src/sultanoo):
// the page and its worker are there, paths are relative (the site lives under /sultanoo/), every file the page loads
// exists, and no secret key is in any published file. Run: node scripts/ci-check.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const problems = [];
const must = ['index.html', 'sw.js', 'manifest.json', 'offline.html'];
for (const f of must) if (!fs.existsSync(path.join(root, f))) problems.push(`missing ${f}`);

const html = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = m[1];
  if (/^(https?:|data:|#)/.test(ref)) continue;
  if (ref.startsWith('/')) problems.push(`absolute path in index.html: ${ref}`);
  else if (!fs.existsSync(path.join(root, ref.split('?')[0]))) problems.push(`index.html loads a missing file: ${ref}`);
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.name.startsWith('.') ? [] : d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
for (const f of walk(root).filter((x) => /\.(js|html|json|css)$/.test(x))) {
  const t = fs.readFileSync(f, 'utf8');
  if (/sb_secret_[A-Za-z0-9]/.test(t) || /"role"\s*:\s*"service_role"/.test(t)) problems.push(`secret key in ${path.relative(root, f)}`);
}

if (problems.length) { console.error('PROBLEMS:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('Sultanoo site OK');

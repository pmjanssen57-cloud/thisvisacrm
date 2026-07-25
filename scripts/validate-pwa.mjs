import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/offline.html',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/icon-maskable-192.png',
  'public/icon-maskable-512.png',
  'public/apple-touch-icon.png',
];

for (const file of requiredFiles) await access(path.join(root, file));

const manifest = JSON.parse(await readFile(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
if (manifest.name !== 'THiS CRM') throw new Error('Manifest name must be THiS CRM.');
if (manifest.display !== 'standalone') throw new Error('Manifest display must be standalone.');
if (!String(manifest.start_url || '').startsWith('/')) throw new Error('Manifest start_url must be root-relative.');
if (!Array.isArray(manifest.icons) || manifest.icons.length < 4) throw new Error('Manifest must include standard and maskable icons.');
if (!manifest.icons.some((icon) => String(icon.purpose || '').includes('maskable'))) throw new Error('Manifest must include a maskable icon.');

const serviceWorker = await readFile(path.join(root, 'public/sw.js'), 'utf8');
for (const excludedPath of ["'/api/'", "'/.netlify/functions/'", "'/.netlify/identity/'"]) {
  if (!serviceWorker.includes(excludedPath)) throw new Error(`Service worker must exclude ${excludedPath}.`);
}
if (!serviceWorker.includes("request.mode === 'navigate'")) throw new Error('Service worker must provide a navigation fallback.');
if (!serviceWorker.includes("'/offline.html'")) throw new Error('Service worker must reference the offline page.');

const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('rel="manifest"')) throw new Error('index.html must link the web-app manifest.');
if (!indexHtml.includes('name="theme-color"')) throw new Error('index.html must include a theme colour.');

console.log('THiS CRM PWA validation passed.');

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : `${dir}/${entry.name}`));
  return nested.flat();
}
const files = (await walk('dist')).filter((file) => !file.endsWith('/sw.js')).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const cacheName = `ai-city-${hash.digest('hex').slice(0, 16)}`;
const urls = files.map((file) => `/ai_city/${file.slice(5)}`);
await writeFile('dist/sw.js', `const CACHE = ${JSON.stringify(cacheName)};
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES))); });
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ai-city-') && key !== CACHE).map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/ai_city/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/ai_city/index.html')));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
`);

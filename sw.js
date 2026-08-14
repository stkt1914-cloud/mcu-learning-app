/* ===== Service Worker：离线优先（单片机学习） ===== */
'use strict';

var CACHE = 'mculearn-v1';
var PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/highlight.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './data/chapter-01.js',
  './data/chapter-02.js',
  './data/chapter-03.js',
  './data/chapter-04.js',
  './data/chapter-05.js',
  './data/chapter-06.js',
  './data/chapter-07.js',
  './data/chapter-08.js',
  './data/chapter-09.js',
  './data/chapter-10.js',
  './data/chapter-11.js',
  './data/chapter-12.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(PRECACHE).catch(function () { /* 个别文件失败不阻塞 */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // 导航请求：网络优先，失败回退缓存（保证更新后刷新即可看到新版本）
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  // 其余静态资源：缓存优先，失败时网络并回填
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return resp;
      }).catch(function () { return new Response('', { status: 504, statusText: 'Offline' }); });
    })
  );
});

// 홈 화면 앱(PWA)용 서비스워커.
// 목적은 두 가지다. 안드로이드가 설치 배너를 띄우려면 fetch 핸들러가 필요하고,
// 껍데기를 캐시해 두면 앱을 열 때 흰 화면 없이 바로 뜬다.
//
// 캐시 이름의 버전을 올리면 이전 캐시는 activate에서 전부 지워진다.
// public/ 안의 이미지(og-image.jpg, ad-olivetta.jpg 등)를 교체했는데
// 반영이 안 되면 이 숫자를 올릴 것.
const CACHE = 'hairfit-v1';
const FALLBACK = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([FALLBACK, '/icons/icon-192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putInCache = async (request, response) => {
  if (response && response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 생성 요청은 절대 캐시하지 않는다. 매번 서버가 판단해야 하는 요청이다.
  if (url.pathname.startsWith('/api/')) return;

  // 페이지 진입: 네트워크 우선. 오프라인이면 캐시된 껍데기라도 띄운다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(FALLBACK, response))
        .catch(() => caches.match(FALLBACK))
    );
    return;
  }

  // 빌드 산출물은 파일명에 해시가 붙어 내용이 바뀌면 이름도 바뀐다. 캐시 우선이 안전하다.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((r) => putInCache(request, r)))
    );
    return;
  }

  // 나머지(이미지 등)는 이름이 그대로인 채 내용만 바뀔 수 있으므로 네트워크 우선.
  event.respondWith(
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => caches.match(request))
  );
});

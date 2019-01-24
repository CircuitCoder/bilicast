let ENV = null;

function isBackend(req) {
  const url = new URL(req.url);

  if(url.pathname.indexOf('/entry') === 0
    || url.pathname.indexOf('/list') === 0
    || url.pathname.indexOf('/store') === 0
    || url.pathname.indexOf('/helper') === 0)
    return true;

  return false;
}

function noCache(req) {
  const url = new URL(req.url);

  if(url.pathname.indexOf('/sockjs-node') === 0)
    return true;
  if(url.pathname.indexOf('\.hot-update\.') !== -1)
    return true;
  if(url.pathname.indexOf('/manifest') === 0)
    return true;
  if(url.pathname.indexOf('/favicon') === 0)
    return true;

  return false;
}

async function serveIndex() {
  try {
    const resp = await fetch('/index.html')
    const cache = await caches.open('v1');
    await cache.put('/index.html', resp.clone());
    return resp;
  } catch(e) {
    console.error(e);
    return await caches.match('/index.html');
  }
}

function fromCache(req) {
  const url = new URL(req.url);
  const pn = url.pathname;

  if(url.host.indexOf('fonts') === -1)
    if(pn === '' || pn === '/' || pn === '/new' || pn === '/login' || pn.split('/').length === 2)
      return serveIndex();

  return caches.match(req).then(resp => {
    if(resp)
      return resp;

    return fetch(req).then(liveresp =>
      caches.open('v1').then(cache => {
        cache.put(req, liveresp.clone());
        return liveresp;
      })
    ).catch(e => {
      return new Response('', { status: 404, statusText: 'Cache missed' });
    });
  });
}

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const toBackend = isBackend(event.request);

  if(toBackend) // Cache is now handled by the frontend
    return;

  console.log(noCache(event.request), event.request.url);
  if(noCache(event.request)) return null;

  // No asset caching in dev mode
  if(ENV !== 'production') return null;

  // Is assets, find from cache
  const resp = fromCache(event.request);
  if(resp !== null) event.respondWith(resp);
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', ev => {
  const msg = ev.data;

  if(msg.type === 'setEnv') {
    console.log(msg);
    ENV = msg.env;
    if(ENV === 'production')
      caches.open('v1').then(cache =>
        cache.addAll([
          '/index.html',
        ])
      )
    // TODO: claim
  }
});

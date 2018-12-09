let ENV = null;

function isBackend(req) {
  const url = new URL(req.url);

  if(url.pathname.indexOf('/entry') === 0
    || url.pathname.indexOf('/list') === 0
    || url.pathname.indexOf('/store') === 0)
    return true;

  return false;
}

function noCache(req) {
  const url = new URL(req.url);

  if(url.pathname.indexOf('/sockjs-node') === 0)
    return true;

  return false;
}

function fromCache(req) {
  const url = new URL(req.url);
  const pn = url.pathname;

  if(pn === '/' || pn === '/new' || pn.split('/').length === 2) {
    // From index
    // TODO: respond with cache
    return null;
  }

  return caches.match(req).then(resp => {
    if(resp) return resp;

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

async function fetchBackend(req) {
  if(req.method !== 'GET') return fetch(req);

  const url = new URL(req.url);
  const queries = url.search.substr(1).split('&').map(decodeURIComponent);

  const liveReq = new Request(req.url.split('?')[0], {
    method: req.method,
    headers: req.headers,
    credentials: req.credentials,
  });

  if(queries.includes('cache') && !queries.includes('update')) {
    console.log(`Fetching from cache: ${liveReq.url}`);
    const slot = await caches.match(liveReq);
    if(slot) return slot;
    else console.log('Missed');
  }

  const live = await fetch(liveReq);

  if(queries.includes('update')) {
    const cache = await caches.open('v1');

    let modified;
    if(live.headers.get('Content-Type').match(/^application\/json;?/)) {
      const body = await live.json();

      body.cached = true;
      modified = new Response(JSON.stringify(body), {
        status: live.status,
        statusText: live.statusText,
        headers: live.headers,
      });
    } else
      modified = live;

    const returning = modified.clone();
    cache.put(liveReq, modified);

    return returning;
  }

  return live;
}

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const toBackend = isBackend(event.request);

  if(toBackend)
    event.respondWith(fetchBackend(event.request).then(resp => {
      if(resp) return resp;
      else return fetch(event.request);
    }));

  if(noCache(event.request)) return null;

  // No asset caching in dev mode
  if(ENV !== 'production') return null;

  // Is assets, find from cache
  const resp = fromCache(event.request);
  if(resp !== null) event.respondWith(resp);
});

self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    for(const client of clients)
      client.navigate(client.url);
  });
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

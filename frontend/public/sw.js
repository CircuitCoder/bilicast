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
    const resp = await caches.match(liveReq);
    if(resp) {
      // Range: https://bugs.chromium.org/p/chromium/issues/detail?id=575357#c10
      const range = req.headers.get('Range');
      console.log(range);
      if(!range)
        return resp;

      const startPos = Number(range.match(/^bytes\=(\d+)\-/)[1]);
      console.log(startPos);

      const ab = await resp.arrayBuffer();

      const headers = resp.headers;
      headers.append('Content-Range', `bytes ${startPos}-${ab.byteLength-1}/${ab.byteLength}`);
      return new Response(
        ab.slice(startPos),
        {
          status: 206,
          statusText: 'Partial Content',
          headers,
        },
      );
    } else console.log('Missed');
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

  if(toBackend) {
    event.respondWith(fetchBackend(event.request).then(resp => {
      if(resp) return resp;
      else return fetch(event.request);
    }));
    return;
  }

  console.log(noCache(event.request), event.request.url);
  if(noCache(event.request)) return null;

  // No asset caching in dev mode
  if(ENV !== 'production') return null;

  // Is assets, find from cache
  const resp = fromCache(event.request);
  if(resp !== null) event.respondWith(resp);
});

self.addEventListener('activate', event => {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    for(const client of clients)
      client.navigate(client.url);
  });
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

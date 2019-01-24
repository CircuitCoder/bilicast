import idb from 'idb';

import { BACKEND } from './config';

if(!window.indexedDB)
  window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
if(!window.IDBTransaction)
  window.IDBTransaction = window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"};
if(!window.IDBKeyRange)
  window.IDBKeyRange = window.webkitIDBKeyRange || window.msIDBKeyRange;

let passphrase = null;

async function parseResp(resp) {
  if(resp.status === 204) return null;
  else if(resp.status !== 200) throw resp.statusText;
  else if(resp.headers.get('Content-Type').indexOf('application/json') === 0)
    return resp.json();
  else return resp.blob();
}

function buildHeaders() {
  const result = new Headers({
    'Content-Type': 'application/json',
  });

  if(passphrase !== null)
    result.append('Authorization', `Bearer ${passphrase}`);

  return result;
}

function blobToDataURI(blob) {
  const reader = new FileReader();

  const result = new Promise(resolve => {
    reader.addEventListener('load', () => resolve(reader.result));
  });

  reader.readAsDataURL(blob);
  return result;
}

export async function post(endpoint, payload, method = 'POST') {
  let uri = endpoint;
  if(uri.indexOf('/') === 0) uri = BACKEND + uri;
  const resp = await fetch(uri, {
    method,
    body: JSON.stringify(payload),
    headers: buildHeaders(),
  });

  return parseResp(resp);
}

export async function get(endpoint, method = 'GET') {
  let uri = endpoint;
  if(uri.indexOf('/') === 0) uri = BACKEND + uri;
  const resp = await fetch(uri, {
    method,
    headers: buildHeaders(),
  });

  return parseResp(resp);
}

let dbPromise = Promise.resolve(null);
let cachePromise = Promise.resolve(null);
if(window.indexedDB) {
  dbPromise = idb.open('persistent', 1, upgradeDB => {
    upgradeDB.createObjectStore('persistent');
  });

  cachePromise = idb.open('cache', 1, upgradeDB => {
    upgradeDB.createObjectStore('artwork');
    upgradeDB.createObjectStore('content');
    upgradeDB.createObjectStore('entry');
    upgradeDB.createObjectStore('list');
  });
}

export async function auth(req) {
  const headers = new Headers();
  if(req) headers.append('Authorization', `Bearer ${req}`);

  const resp = await fetch(BACKEND + '/helper/auth', {
    method: 'GET',
    headers,
  });

  const payload = await parseResp(resp);

  if(payload.success) {
    passphrase = req;

    const db = await dbPromise;
    if(db) {
      const tx = db.transaction('persistent', 'readwrite');
      if(req)
        tx.objectStore('persistent').put(req, 'passphrase');
      else
        tx.objectStore('persistent').delete('passphrase');
      await tx.complete;
    }

    return true;
  }

  return false;
}

export async function savedAuth() {
  const db = await dbPromise;
  if(!db) return false;
  const passphrase = await db.transaction('persistent').objectStore('persistent').get('passphrase');

  const resp = await auth(passphrase);
  if(!resp) return false;
  if(!passphrase) return null; // Special value
  return true;
}

export async function unauth() {
  const db = await dbPromise;
  if(!db) return;

  await db.transaction('persistent', 'readwrite').objectStore('persistent').delete('passphrase');
}

function storeTmpl(target) {
  return async (id, content) => {
    const cache = await cachePromise;
    await cache.transaction(target, 'readwrite').objectStore(target).put(content, id);
  }
}

function matchTmpl(target, convert, fb) {
  return async id => {
    const cache = await cachePromise;
    const fallback = fb(id);
    if(!cache)
      return fallback;

    const result = await cache.transaction(target).objectStore(target).get(id);
    if(result)
      return await convert(result);

    return fallback;
  }
}

export const storeArtwork = storeTmpl('artwork');
export const storeMusic = storeTmpl('content');
export const storeEntry = storeTmpl('entry');
export const storeList = storeTmpl('list');

export const artwork = matchTmpl('artwork', blobToDataURI, id => `${BACKEND}/store/${id}/art.jpg`);
export const music = matchTmpl('content', blobToDataURI, id => `${BACKEND}/store/${id}/content.m4a`);
export const matchEntry = matchTmpl('entry', async e => e, () => null);
export const matchList = matchTmpl('list', async e => e, () => null);

export async function loadRecents() {
  const db = await dbPromise;
  if(!db) return false;
  const result = await db.transaction('persistent').objectStore('persistent').get('recents');
  return result || [];
}

export async function saveRecents(recents) {
  const db = await dbPromise;
  if(!db) return false;
  await db.transaction('persistent', 'readwrite').objectStore('persistent').put(recents, 'recents');
}

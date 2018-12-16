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
  else return resp.text();
}

function buildHeaders() {
  const result = new Headers({
    'Content-Type': 'application/json',
  });

  if(passphrase !== null)
    result.append('Authorization', `Bearer ${passphrase}`);

  return result;
}

export async function post(endpoint, payload, method = 'POST') {
  const resp = await fetch(BACKEND + endpoint, {
    method,
    body: JSON.stringify(payload),
    headers: buildHeaders(),
  });

  return parseResp(resp);
}

export async function get(endpoint, method = 'GET') {
  const resp = await fetch(BACKEND + endpoint, {
    method,
    headers: buildHeaders(),
  });

  return parseResp(resp);
}

let dbpromise = Promise.resolve(null);
if(window.indexedDB)
  dbpromise = idb.open('persistent', 1, upgradeDB => {
    upgradeDB.createObjectStore('persistent');
  });

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

    const db = await dbpromise;
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
  const db = await dbpromise;
  if(!db) return false;
  const passphrase = await db.transaction('persistent').objectStore('persistent').get('passphrase');

  const resp = await auth(passphrase);
  if(!resp) return false;
  if(!passphrase) return null; // Special value
  return true;
}

export async function unauth() {
  const db = await dbpromise;
  if(!db) return;

  await db.transaction('persistent', 'readwrite').objectStore('persistent').delete('passphrase');
}

export function artwork(id) {
  return `${BACKEND}/store/${id}/art.jpg?cache`;
}

export function music(id) {
  return `${BACKEND}/store/${id}/content.m4a?cache`;
}

export async function loadRecents() {
  const db = await dbpromise;
  if(!db) return false;
  const result = await db.transaction('persistent').objectStore('persistent').get('recents');
  return result || [];
}

export async function saveRecents(recents) {
  const db = await dbpromise;
  if(!db) return false;
  await db.transaction('persistent', 'readwrite').objectStore('persistent').put(recents, 'recents');
}

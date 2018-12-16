import { BACKEND } from './config';

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

export async function auth(req) {
  const resp = await fetch(BACKEND + '/helper/auth', {
    method: 'GET',
    headers: new Headers({
      'Authorization': `Bearer ${req}`,
    }),
  });

  const payload = await parseResp(resp);

  if(payload.success) {
    passphrase = req;
    return true;
  }

  return false;
}

export function artwork(id) {
  return `${BACKEND}/store/${id}/art.jpg?cache`;
}

export function music(id) {
  return `${BACKEND}/store/${id}/content.m4a?cache`;
}

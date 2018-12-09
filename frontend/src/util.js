import { BACKEND } from './config';

async function parseResp(resp) {
  if(resp.status === 204) return null;
  else if(resp.status !== 200) throw resp.statusText;
  else if(resp.headers.get('Content-Type').indexOf('application/json') === 0)
    return resp.json();
  else return resp.text();
}

export async function post(endpoint, payload, method = 'POST') {
  const resp = await fetch(BACKEND + endpoint, {
    method,
    body: JSON.stringify(payload),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
  });

  return parseResp(resp);
}

export async function get(endpoint, method = 'GET') {
  const resp = await fetch(BACKEND + endpoint, {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
  });

  return parseResp(resp);
}

export function artwork(id) {
  return `${BACKEND}/store/${id}/art.jpg?cache`;
}

export function music(id) {
  return `${BACKEND}/store/${id}/content.m4a?cache`;
}

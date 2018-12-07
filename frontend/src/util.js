export async function post(endpoint, payload, method = 'POST') {
  const resp = await fetch(endpoint, {
    method,
    body: JSON.stringify(payload),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
  });

  if(resp.status === 204) return null;
  else if(resp.status !== 200) throw resp.statusText;
  else if(resp.headers.get('Content-Type').indexOf('application/json') === 0)
    return resp.json();
  else return resp.text();
}

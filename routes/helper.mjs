import Router from 'koa-router';

import request from '../request';

import { auth, authMiddleware } from '../util';

const router = new Router();

router.get('/playlist/:uid/:favid', authMiddleware, async ctx => {
  const p1uri = `https://api.bilibili.com/x/space/fav/arc?vmid=${ctx.params.uid}&fid=${ctx.params.favid}&pn=1&order=fav_time`;

  const resp = await request({
    uri: p1uri,
    json: true,
  });

  if(resp.code !== 0) return ctx.status = 400;

  const pc = resp.data.pagecount;
  const resps = [Promise.resolve(resp)];
  for(let i = 2; i<=pc; i+=1) {
    const uri = `https://api.bilibili.com/x/space/fav/arc?vmid=${ctx.params.uid}&fid=${ctx.params.favid}&pn=${i}&order=fav_time`;
    resps.push(request({ uri, json: true }));
  }

  const entries = await Promise.all(resps.map(async e => {
    const resp = await e;
    if(resp.code !== 0) throw new Error();
    const archives = resp.data.archives;
    const filtered = archives.filter(e => e.duration > 0);
    return filtered.map(e => 'av' + e.aid);
  }));

  const agg = entries.reduce((acc, e) => acc.concat(e), []);
  agg.reverse();
  return ctx.body = agg;
});

router.get('/auth', async ctx => {
  if(auth(ctx.request)) return ctx.body = { success: true };
  else return ctx.body = { success: false };
});

export default router;

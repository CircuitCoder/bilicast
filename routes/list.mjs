import util from 'util';
import crypto from 'crypto';

import Router from 'koa-router';

const randomBytes = util.promisify(crypto.randomBytes);

import List from '../db/List.mjs';

import { authMiddleware } from '../util.mjs';

const router = new Router();

router.post('/', authMiddleware, async ctx => {
  const id = ctx.request.body.id || (await randomBytes(12)).toString('hex');
  const list = await List.create({
    _id: id,
    name: ctx.request.body.name,
  });

  ctx.body = list.toObject();
});

router.get('/:id', async ctx => {
  const list = await List.findById(ctx.params.id).lean();
  return ctx.body = list;
});

router.post('/:id/entries', authMiddleware, async ctx => {
  const list = [...ctx.request.body];
  list.reverse();
  for(const row of list) {
    await List.findOneAndUpdate({
      _id: ctx.params.id,
      entries: { $ne: row },
    }, {
      $push: { entries: {
        $each: [row],
        $position: 0,
      }},
    })
  }

  return ctx.status = 204;
});

// TODO: support multiple entries?

router.delete('/:id/entries/:eid', authMiddleware, async ctx => {
  const resp = await List.findOneAndUpdate({
    _id: ctx.params.id,
  }, {
    $pull: { entries: ctx.params.eid, },
  }).lean();
  if(resp) return ctx.status = 204;
  else return ctx.status = 404;
});

router.post('/:id/entries/move', authMiddleware, async ctx => {
  const { from, to } = ctx.request.body;
  if(from === to) return ctx.status = 204;

  const { entries } = await List.findById(ctx.params.id, { entries: 1 }).lean();
  const target = entries[from];
  if(from < to)
    for(let i = from; i < to; ++i)
      entries[i] = entries[i+1];
  else
    for(let i = from; i > to; --i)
      entries[i] = entries[i-1];

  entries[to] = target;
  await List.findOneAndUpdate({
    _id: ctx.params.id,
  }, {
    $set: { entries },
  });
  ctx.status = 204;
});

export default router;

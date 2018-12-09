import util from 'util';
import crypto from 'crypto';

import Router from 'koa-router';

const randomBytes = util.promisify(crypto.randomBytes);

import List from '../db/List';

const router = new Router();

router.post('/', async ctx => {
  const id = ctx.request.body.id || (await randomBytes(12)).toString('hex');
  const list = await List.create({
    _id: id,
    name: ctx.request.body.name,
  });

  ctx.body = list.toObject();
});

router.get('/:id', async ctx => {
  return ctx.body = await List.findById(ctx.params.id).lean();
});

router.post('/:id/entries', async ctx => {
  const resp = await List.findOneAndUpdate({
    _id: ctx.params.id,
  }, {
    $addToSet: { entries: { $each: ctx.request.body } },
  }).lean();
  if(resp) return ctx.status = 204;
  else return ctx.status = 404;
});

// TODO: support multiple entries?

router.delete('/:id/entries/:eid', async ctx => {
  const resp = await List.findOneAndUpdate({
    _id: ctx.params.id,
  }, {
    $pull: { entries: ctx.params.eid, },
  }).lean();
  if(resp) return ctx.status = 204;
  else return ctx.status = 404;
});

export default router;

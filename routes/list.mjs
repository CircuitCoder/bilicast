import Router from 'koa-router';

import List from '../db/List';

const router = new Router();

router.post('/', async ctx => {
  const list = await List.create({
    name: ctx.request.body.name,
  });

  ctx.body = list.toObject();
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

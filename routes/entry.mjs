import Router from 'koa-router';

import Entry from '../db/Entry';
import logger from '../logger';
import * as util from '../util';

const router = new Router();

async function download(av, dbid) {
  logger.info(`Download from ${av}`);
  const desc = await util.getDesc(av);
  logger.info('Desc: ');
  logger.info(desc);
}

router.get('/download/:av', async ctx => {
  const result = await Entry.findOneAndUpdate({
    source: ctx.params.av,
  }, {
    $setOnInsert: {
      dlTime: new Date().toISOString(),
      status: 'preparing',
    },
  }, {
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true,
    upsert: true,
    rawResult: true,
  });

  if(!result.ok) throw result.lastErrorObject;
  const upserted = !!result.lastErrorObject.upserted;
  const entry = result.value;

  // Fire and forget
  if(upserted)
    download(ctx.params.av, entry._id);

  return ctx.body = { _id: entry._id };
});

export default router;

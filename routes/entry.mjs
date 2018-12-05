import Router from 'koa-router';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';

const access = promisify(fs.access);
const randomBytes = promisify(crypto.randomBytes);

import Entry from '../db/Entry';
import logger from '../logger';
import * as util from '../util';

const basedir = path.dirname(new URL(import.meta.url).pathname);

const router = new Router();

async function download(av, dbid) {
  logger.info(`Download from ${av}`);
  const desc = await util.getDesc(av);
  logger.debug(desc);

  // Selecting best source
  const source = Object.keys(desc.streams).reduce((acc, i) => {
    if(desc.streams[i].container !== 'flv') return acc;
    if(acc === null) return { format: i, ...desc.streams[i] };
    if(desc.streams[i].size > acc.size) return { format: i, ...desc.streams[i] };
    return acc;
  }, null);

  const container = path.resolve(basedir, `../store/${dbid}`);

  Entry.findOneAndUpdate({
    _id: dbid,
  }, {
    $set: {
      status: 'downloading',
      ref: desc.url,
      title: desc.title,
    },
  }, {
    runValidators: true,
  });

  await util.downloadTo(desc.url, source.format, container);

  Entry.findOneAndUpdate({
    _id: dbid,
  }, {
    $set: {
      status: 'converting',
    },
  }, {
    runValidators: true,
  });

  await util.convertMp4(container);
  await util.convertM4a(container);

  Entry.findOneAndUpdate({
    _id: dbid,
  }, {
    $set: {
      status: 'ready',
    },
  }, {
    runValidators: true,
  });
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

router.get('/:id', async ctx => {
  return ctx.body = await Entry.findById(ctx.params.id);
});

export default router;

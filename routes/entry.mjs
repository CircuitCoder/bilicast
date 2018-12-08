import Router from 'koa-router';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';
import request from 'request';

const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);
const randomBytes = promisify(crypto.randomBytes);

import Entry from '../db/Entry';
import logger from '../logger';
import * as util from '../util';

const basedir = path.dirname(new URL(import.meta.url).pathname);

const router = new Router();

async function createEntries(av) {
  const descs = await util.getDesc(av);
  const results = await Promise.all(descs.map((e, i) =>
    Entry.findOneAndUpdate({
      source: av,
      page: i+1,
    }, {
      $setOnInsert: {
        dlTime: new Date().toISOString(),
        status: 'preparing',
        title: e.title,
        ref: e.url,
      },
    }, {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
      rawResult: true,
    })
  ));

  return results.map((result, i) => {
    if(!result.ok) throw result.lastErrorObject;
    const upserted = !!result.lastErrorObject.upserted;
    const entry = result.value;

    return {
      upserted,
      entry,
      desc: descs[i],
    };
  });
}

async function download(av, dbid, desc) {
  const container = path.resolve(basedir, `../store/${dbid}`);
  await mkdir(container);

  logger.info(`Download from ${av}`);
  const detail = await util.getDetail(av);
  logger.debug(detail);

  await new Promise(resolve => 
    request(detail.View.pic)
      .on('end', resolve)
      .pipe(fs.createWriteStream(path.join(container, 'art.jpg'))) // TODO: other ext
  );

  await Entry.findOneAndUpdate({
    _id: dbid,
  }, {
    $set: {
      status: 'downloading',
      uploader: detail.Card.card.name,
      category: detail.View.tname,
    },
  }, {
    runValidators: true,
  });

  // Selecting best source
  const source = Object.keys(desc.streams).reduce((acc, i) => {
    if(desc.streams[i].container !== 'flv') return acc;
    if(acc === null) return { format: i, ...desc.streams[i] };
    if(desc.streams[i].size > acc.size) return { format: i, ...desc.streams[i] };
    return acc;
  }, null);

  await Entry.findOneAndUpdate({
    _id: dbid,
  }, {
    $set: {
      ref: desc.url,
    },
  }, {
    runValidators: true,
  });

  await util.downloadTo(desc.url, source.format, container);

  await Entry.findOneAndUpdate({
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

  await Entry.findOneAndUpdate({
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
  const handles = await createEntries(ctx.params.av);

  // Fire and forget
  for(const { upserted, entry, desc } of handles)
    if(upserted)
      download(ctx.params.av, entry._id, desc);

  return ctx.body = handles.map(e => e.entry._id);
});

router.get('/:id', async ctx => {
  return ctx.body = await Entry.findById(ctx.params.id);
});

export default router;

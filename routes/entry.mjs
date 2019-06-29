import Router from 'koa-router';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';

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
  const single = descs.length === 1;
  const results = await Promise.all(descs.map((e, i) => {
    const titleSegs = e.title.split(` #${i+1}. `);
    return Entry.findOneAndUpdate({
      source: av,
      page: i+1,
    }, {
      $setOnInsert: {
        dlTime: new Date().toISOString(),
        status: 'preparing',
        title: titleSegs[0],
        subtitle: titleSegs[1],
        ref: e.url,

        desc: descs[i],

        single,
      },
    }, {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
      rawResult: true,
    })
  }));

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

const STAGES = {
  preparing: 0,
  downloading: 1,
  converting: 2,
  ready: 3,
};

async function download(av, dbid, desc, status = 'preparing') {
  if(status === 'ready') return;

  const container = path.resolve(basedir, `../store/${dbid}`);

  if(STAGES[status] <= STAGES.preparing) {
    await mkdir(container, { recursive: true });

    logger.info(`Download from ${av}`);
    const detail = await util.getDetail(av);
    logger.debug(detail);

    await new Promise(resolve => 
      detail.thumb
        .on('end', resolve)
        .pipe(fs.createWriteStream(path.join(container, 'art.jpg'))) // TODO: other ext
    );

    await Entry.findOneAndUpdate({
      _id: dbid,
    }, {
      $set: {
        status: 'downloading',
        uploader: detail.uploader,
        category: detail.category,
      },
    }, {
      runValidators: true,
    });
  }

  if(STAGES[status] <= STAGES.downloading) {
    // Selecting best source
    const streams = { ...desc.streams, ...desc.dash_streams };
    const source = Object.keys(streams).reduce((acc, i) => {
      if(!['flv', 'mp4'].includes(streams[i].container)) return acc;
      if(acc === null) return { format: i, ...streams[i] };
      if(streams[i].size > acc.size) return { format: i, ...streams[i] };
      return acc;
    }, null);

    // Nico wont return a url in their desc
    const uri = desc.url || util.getUri(av);

    await Entry.findOneAndUpdate({
      _id: dbid,
    }, {
      $set: {
        ref: uri,
      },
    }, {
      runValidators: true,
    });

    await util.downloadTo(uri, source.format, container, av);

    await Entry.findOneAndUpdate({
      _id: dbid,
    }, {
      $set: {
        status: 'converting',
      },
    }, {
      runValidators: true,
    });
  }

  const suffix = await util.findSuffix(container)
  await util.convertMp4(container, suffix);
  await util.convertM4a(container, suffix);
  await util.rmRaw(container, suffix);

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

async function scopedDownload(av, dbid, desc, status = 'preparing') {
  let lastStatus = status;
  while(true) {
    try {
      await download(av, dbid, desc, lastStatus);
      break;
    } catch(e) {
      console.error(e);

      const dbinst = await Entry.findById(dbid, { status: 1 }).lean();
      lastStatus = dbinst.status;
    }
  }
}

// Kickoff all unfinished downloads
async function housecleanSingle(entry) {
  console.log(`Got unfinished job: ${entry._id}`);
  if(!entry.desc) {
    const descs = await util.getDesc(entry.source);
    const desc = descs[entry.page-1];

    entry.desc = desc;
    await entry.save();
  }

  try {
    await scopedDownload(entry.source, entry._id, entry.desc, entry.status);
  } catch(e) {
    console.error(e.stack);
  }
}

async function houseclean() {
  const insts = await Entry.find({
    status: { $ne: 'ready' },
  });

  await Promise.all(insts.map(housecleanSingle));
}

houseclean();

router.get('/download/:av', util.authMiddleware, async ctx => {
  const handles = await createEntries(ctx.params.av);

  // Fire and forget
  for(const { upserted, entry, desc } of handles)
    if(upserted)
      scopedDownload(ctx.params.av, entry._id, desc);

  return ctx.body = handles.map(e => e.entry._id);
});

router.get('/:id', async ctx => {
  const entry = await Entry.findById(ctx.params.id);
  if(entry) return ctx.body = entry;
  else return ctx.status = 404;
});

export default router;

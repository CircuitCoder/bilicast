import Router from 'koa-router';

import entry from './entry.mjs';
import list from './list.mjs';
import helper from './helper.mjs';

const router = new Router();

router.use('/entry', entry.routes());
router.use('/list', list.routes());
router.use('/helper', helper.routes());

export default router;

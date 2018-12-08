import Router from 'koa-router';

import entry from './entry';
import list from './list';
import helper from './helper';

const router = new Router();

router.use('/entry', entry.routes());
router.use('/list', list.routes());
router.use('/helper', helper.routes());

export default router;

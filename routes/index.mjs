import Router from 'koa-router';

import entry from './entry';
import list from './list';

const router = new Router();

router.use('/entry', entry.routes());
router.use('/list', list.routes());

export default router;

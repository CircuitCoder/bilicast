import Router from 'koa-router';

import entry from './entry';

const router = new Router();

router.use('/entry', entry.routes());

export default router;

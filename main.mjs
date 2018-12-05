import path from 'path';

import Koa from 'koa';
import Helmet from 'koa-helmet';
import Static from 'koa-static';

import router from './routes';

const basedir = path.dirname(new URL(import.meta.url).pathname);

const app = new Koa();

app.use(Helmet());
app.use(router.routes(), router.allowedMethods());
app.use(Static(path.join(basedir, 'public')));
app.use(Static(path.join(basedir, 'store')));

const port = process.env.PORT || 8674;
app.listen(port, () => {
  console.log(`Server is up at port ${port}`);
});

import path from 'path';

import Koa from 'koa';
import Helmet from 'koa-helmet';
import Static from 'koa-static';
import mongoose from 'mongoose';
import Mount from 'koa-mount';

import router from './routes';

const dburi = process.env.DBURI || 'mongodb://localhost/bilicast';
mongoose.connect(dburi);

const basedir = path.dirname(new URL(import.meta.url).pathname);

const app = new Koa();

app.use(Helmet());
app.use(router.routes(), router.allowedMethods());
app.use(Static(path.join(basedir, 'public')));
app.use(Mount('/store', Static(path.join(basedir, 'store'))));

const port = process.env.PORT || 8674;
app.listen(port, () => {
  console.log(`Server is up at port ${port}`);
});

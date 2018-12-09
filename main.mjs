import path from 'path';

import Koa from 'koa';
import Helmet from 'koa-helmet';
import Static from 'koa-static';
import mongoose from 'mongoose';
import Mount from 'koa-mount';
import Bodyparser from 'koa-bodyparser';
import CORS from '@koa/cors';

import router from './routes';

const dburi = process.env.DBURI || 'mongodb://localhost/bilicast';
mongoose.connect(dburi, { useNewUrlParser: true });

const basedir = path.dirname(new URL(import.meta.url).pathname);

const app = new Koa();

app.use(Helmet());
app.use(CORS({
  credentials: true,
}));
app.use(Bodyparser());
app.use(router.routes(), router.allowedMethods());
app.use(Static(path.join(basedir, 'frontend', 'build')));
app.use(Mount('/store', Static(path.join(basedir, 'store'))));

const port = process.env.PORT || 8674;
app.listen(port, () => {
  console.log(`Server is up at port ${port}`);
});

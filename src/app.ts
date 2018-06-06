import * as Koa from 'koa';
import * as koaBody from 'koa-body';
import * as morgan from 'koa-morgan';
import * as validate from 'koa-validate';
import errorHandler from './middleware/errorHandler';
import api from './router/api';

const app = new Koa();

// logger
app.use(morgan('[:date[clf]] :method :url :status :res[content-length] - :response-time ms'));

// error handler
app.use(errorHandler);

// params binding and validation
app.use(koaBody());
validate(app);

// routes
app
  .use(api.routes())
  .use(api.allowedMethods());

export default app;

import { Middleware } from 'koa';
import { APIError } from '../utils';

const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof APIError) {
      ctx.status = 400;
      ctx.body = err;
    } else {
      console.log(err);
      ctx.status = 500;
      ctx.body = new APIError('internal:unknown_error', '');
    }
  }
};

export default errorHandler;

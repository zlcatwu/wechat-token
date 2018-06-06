declare module 'koa-validate' {
  import * as Koa from 'koa';
  function koaValidate(koa: Koa): void;
  namespace koaValidate {}
  export = koaValidate;
}

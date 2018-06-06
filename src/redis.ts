import * as redis from 'redis';
import * as util from 'util';
import config from './config';

export const client = redis.createClient({
  host: config.REDIS.host,
  password: config.REDIS.pass || undefined,
  port: config.REDIS.port,
});
export const sub = redis.createClient();
export const pub = redis.createClient();

export const expireAsync = util.promisify(client.expire);
export const setAsync = util.promisify(client.set);
export const getAsync = util.promisify(client.get);
export const setnxAsync = util.promisify(client.setnx);
export const publishAsync = util.promisify(client.publish);
// 以下函数不符合 util.promisify 的要求，故需另外封装
const delAsync = (key: string) => {
  return new Promise((resolve, reject) => {
    client.del(key, (err, reply) => {
      if (err) { return reject(err); }
      resolve(reply);
    });
  });
};

export const getLock = async (name: string) => {
  const key = `lock-${name}`;
  const isSuccess = Boolean(await setnxAsync.call(client, key, ''));
  if (isSuccess) { await expireAsync.bind(client)(key, 30); }
  return isSuccess;
};

export const releaseLock = async (name: string) => {
  const key = `lock-${name}`;
  return Boolean(await delAsync(key));
};

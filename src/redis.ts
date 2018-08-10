import * as bluebird from 'bluebird';
import * as redis from 'redis';
import config from './config';

interface RedisAsync {
  setAsync(key: string, value: string): Promise<"OK">;
  setexAsync(key: string, seconds: number, value: string): Promise<string>;
  setnxAsync(key: string, value: string): Promise<number>;
  saddAsync(key: string, value: string | string[]): Promise<number>;
  spopAsync(key: string): Promise<string>;
  scardAsync(key: string): Promise<number>;
  getAsync(key: string): Promise<string>;
  delAsync(key: string): Promise<number>;
  existsAsync(key: string): Promise<number>;
  expireAsync(key: string, seconds: number): Promise<number>;
  incrAsync(key: string): Promise<number>;
}

bluebird.promisifyAll(redis);
const options = {
  host: config.REDIS.host,
  password: config.REDIS.pass || undefined,
  port: config.REDIS.port,
};
export const subClient = redis.createClient(options);
export const pubClient = redis.createClient(options);
export const clientAsync: RedisAsync = redis.createClient(options) as any;

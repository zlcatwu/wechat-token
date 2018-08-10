import * as fs from 'fs';
import * as util from 'util';
import config from './config';
import { clientAsync } from './redis';

export class APIError {
  constructor(public code: string, public message: string) {}
}

type SubscribeCallback = (err: Error, data: any) => void;
/**
 * @description 订阅、发布调度类
 */
export class Dispatcher {
  public subscriber: SubscribeCallback[];

  constructor() {
    this.subscriber = [];
  }

  /**
   * publish
   * @param data 要发布的数据
   * @description 发布数据
   */
  public publish(data: any) {
    this.subscriber.forEach((s) => s(null, data));
    this.subscriber = [];
  }

  /**
   * subscribe
   * @param cb 订阅的数据发布时的处理回调函数
   * @description 订阅
   */
  public subscribe(cb: SubscribeCallback) {
    this.subscriber.push(cb);
  }

  /**
   * unpublish
   * @description 当发布者出现问题时调用，通知订阅者出现故障
   */
  public unpublish(err: Error) {
    this.subscriber.forEach((s) => s(err, null));
  }
}

export const readFileAsync = util.promisify(fs.readFile);
export const delayAsync = (seconds: number) => util.promisify(setTimeout)(seconds);

export const getLock = async (name: string, time: number) => {
  const key = `lock-${name}`;
  const isSuccess = Boolean(await clientAsync.setnxAsync(key, ''));
  if (isSuccess) { await clientAsync.expireAsync(key, time); }
  return isSuccess;
};

export const releaseLock = async (name: string) => {
  const key = `lock-${name}`;
  return Boolean(await clientAsync.delAsync(key));
};

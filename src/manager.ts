import * as fs from 'fs';
import * as path from 'path';
import * as request from 'request-promise';
import { clientAsync, pubClient, subClient } from './redis';
import { delayAsync, Dispatcher, getLock, releaseLock } from './utils';

interface WechatConfig {
  appsecret: string;
  appid: string;
}

const ERROR_DELAY_TIME = 3; // s
const REFRESH_TIME = 7200 - 60 * 5; // s
const TRY_MAX_TIMES = 5; // s

/**
 * @description 用于管理 access_token ，使用单例实现
 */
export default class TokenManager {
  /**
   * getInstance
   * @description 获取全局单例
   */
  public static getInstance() {
    if (TokenManager.instance === null) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private static instance: TokenManager | null = null;
  // 进行过注册的应用
  private allowed: Map<string, boolean>;
  private dispatchers: Map<string, Dispatcher>;
  private timers: Map<string, NodeJS.Timer>;
  private constructor() {
    this.allowed = new Map();
    this.dispatchers = new Map();
    this.timers = new Map();
    this.regist();
  }

  /**
   * getToken
   * @param {function} cb 获取到 access_token 后的回调函数
   * @description 通过回调获取 access_token
   */
  public async getToken(app: WechatConfig, cb: (err: Error, data: any) => void) {
    const key = this.getKey(app);
    this.check(key);
    const data = await this.getTokenAndTime(app);
    if (data.token !== null) { return cb(null, data); }
    // 推入等待获取 token 的队列并发起刷新请求
    this.subscribe(app, cb);
    this.refreshToken(app);
  }

  /**
   * refreshToken
   * @param {function} cb 获取到 access_token 后的回调函数
   * @description 提供接口主动刷新 access_token
   */
  public async refreshToken(app: WechatConfig, cb?: (err: Error, data: any) => void) {
    const key = this.getKey(app);
    this.check(key);
    if (cb) { this.dispatchers.get(key).subscribe(cb); }
    for (let i = 0; i < TRY_MAX_TIMES; ++i) {
      try {
        await this.fetchToken(app);
        break;
      } catch (err) {
        console.log(err);
        await delayAsync(ERROR_DELAY_TIME * 1000);
        if (i === TRY_MAX_TIMES - 1) {
          const dispatcher = this.dispatchers.get(key);
          dispatcher.unpublish(new Error('重试次数过多，请稍后重试或检查appid与appsecret是否正确'));
        }
      }
    }
  }

  /**
   * @param key 格式为 'appid-appsecret'
   * @description 该函数检验appid与appsecret的正确性
   */
  private check(key: string) {
    if (!this.allowed.has(key)) { throw new Error('该应用不在管理列表'); }
  }

  private async fetchToken(app: WechatConfig) {
    const key = this.getKey(app);
    // 加锁，只允许一个节点进行获取
    if (!await getLock(key, 30)) { return; }
    const url = 'https://api.weixin.qq.com/cgi-bin/token' +
      `?grant_type=client_credential&appid=${app.appid}&secret=${app.appsecret}`;
    try {
      const data = JSON.parse(await request.get(url));
      if (!data.access_token) { throw new Error(); }
      await this.setTokenInRedis(app, data.access_token);
      await pubClient.publish(key, data.access_token);
    } catch (err) {
      throw new Error('请求失败');
    } finally {
      await releaseLock(key);
    }
  }

  private regist() {
    // 初始化时加载，且仅加载一次，故选用同步加载
    const apps = JSON.parse(fs.readFileSync(path.resolve('config', 'apps.json'), {
      encoding: 'utf-8',
    })) as WechatConfig[];
    apps.forEach((app) => {
      const key = this.getKey(app);
      // 先初始化为 null，在需要时再进行获取
      this.allowed.set(key, null);
      this.dispatchers.set(key, new Dispatcher());
      this.timers.set(key, null);
      subClient.subscribe(key);
      this.refreshToken(app);
    });
    subClient.on('message', (key) => {
      const dispatcher = this.dispatchers.get(key);
      const app = this.parseConfig(key);
      clearTimeout(this.timers.get(key));
      this.getTokenAndTime(app)
        .then((data) => {
          dispatcher.publish(data);
          const timer = setTimeout(() => {
            this.refreshToken(app);
          }, data.time * 1000);
          this.timers.set(key, timer);
        });
    });
  }

  private parseConfig(key: string) {
    const [ appid, appsecret ] = key.split('-');
    return {
      appid,
      appsecret,
    };
  }

  private getKey(app: WechatConfig) {
    return `${app.appid}-${app.appsecret}`;
  }

  private getTimeKey(app: WechatConfig) {
    return `time-${this.getKey(app)}`;
  }

  private getTokenKey(app: WechatConfig) {
    return `token-${this.getKey(app)}`;
  }

  private async getTokenAndTime(app: WechatConfig) {
    const time = await this.getTimeInRedis(app);
    const token = await this.getTokenInRedis(app);
    return {
      time,
      token,
    };
  }

  private async getTokenInRedis(app: WechatConfig) {
    return await clientAsync.getAsync(this.getTokenKey(app));
  }

  private async getTimeInRedis(app: WechatConfig) {
    const createdAt = parseInt(await clientAsync.getAsync(this.getTimeKey(app)), 10);
    return REFRESH_TIME - (Math.floor(Date.now() / 1000) - createdAt);
  }

  private async setTokenInRedis(app: WechatConfig, token: string) {
    const key = this.getTokenKey(app);
    const timeKey = this.getTimeKey(app);
    await clientAsync.setexAsync(key, REFRESH_TIME, token);
    await clientAsync.setexAsync(timeKey, REFRESH_TIME, Math.floor(Date.now() / 1000).toString());
  }

  private subscribe(app: WechatConfig, cb: (err: Error, token: string) => void) {
    const key = this.getKey(app);
    const dispatcher = this.dispatchers.get(key);
    dispatcher.subscribe(cb);
  }
}

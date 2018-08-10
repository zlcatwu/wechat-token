import { Context } from 'koa';
import * as util from 'util';
import TokenManager from '../manager';
import { APIError } from '../utils';

const manager = TokenManager.getInstance();

interface WechatInfo {
  appid: string;
  appsecret: string;
}

const getTokenAsync = (wechatInfo: WechatInfo) => {
  return new Promise((resolve, reject) => {
    manager.getToken(wechatInfo, (err, token) => {
      if (err) { return reject(err); }
      resolve(token);
    })
      .catch((err) => {
        reject(err);
      });
  });
};

const refreshTokenAsync = (wechatInfo: WechatInfo) => {
  return new Promise((resolve, reject) => {
    manager.refreshToken(wechatInfo, (err, token) => {
      if (err) { return reject(err); }
      resolve(token);
    })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * GET /access_token
 * Query: appid, appsecret
 * @description 获取 access_token
 */
export const getAccessToken = async (ctx: Context) => {
  ctx.checkQuery('appid').notEmpty();
  ctx.checkQuery('appsecret').notEmpty();
  if (ctx.errors) { throw new APIError('params_validate_fail', '参数校验错误'); }
  const { appid, appsecret } = ctx.query;
  try {
    const token = await getTokenAsync({ appid, appsecret });
    ctx.body = { token };
  } catch (err) {
    throw new APIError('main:get_token_fail', err.message);
  }
};

/**
 * GET /new_access_token
 * Query: appid, appsecret
 * @description 刷新并获取最新的 access_token
 */
export const refreshAccessToken = async (ctx: Context) => {
  ctx.checkQuery('appid').notEmpty();
  ctx.checkQuery('appsecret').notEmpty();
  if (ctx.errors) { throw new APIError('params_validate_fail', '参数校验错误'); }
  const { appid, appsecret } = ctx.query;
  try {
    const token = await refreshTokenAsync({ appid, appsecret });
    ctx.body = { token };
  } catch (err) {
    throw new APIError('main:get_token_fail', err.message);
  }
};

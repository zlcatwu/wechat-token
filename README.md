# wechat-token-cluster

## 简介

微信小程序/公众号开发中管理`access_token`的中控服务器，该版本为集群版本，可使用集群部署

**程序中使用到了 redis ，运行时请保证 redis 的正常运行**


## 实现功能

* 多个`access_token`的管理
* 提供主动刷新`access_token`的接口
* 定时刷新`access_token`
* 初始化时自动进行一次获取

## 如何运行

* `yarn` 或 `npm install`进行依赖安装
* 在`config/apps.json`中填入需要管理的应用对应的`appid`与`appsecret`
* 在`config/default.json`中填入相应的设置
* `tsc`进行编译
* `npm run start`

## 接口

| URL                 | METHOD | RECEIVE            | RETURN      | DESC                         |
| ------------------- | ------ | ------------------ | ----------- | ---------------------------- |
| `/access_token`     | GET    | `appid, appsecret` | `{ token, time }` | 获取`access_token`与其剩余有效时间(s)           |
| `/new_access_token` | GET    | `appid, appsecret` | `{ token, time }` | 刷新并获取新的`access_token`与其剩余有效时间(s) |


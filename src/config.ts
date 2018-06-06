import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';

interface ServiceConfig {
  port: number;
}

interface RedisConfig {
  host: string;
  port: number;
  pass: string;
}

interface Config {
  SERVICE: ServiceConfig;
  REDIS: RedisConfig;
}

const env = process.env.NODE_ENV === 'production' ? 'production' : 'default';
const configPath = path.resolve(__dirname, '..', 'config', `${env}.json`);
const config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf-8' })) as Config;

export default config;

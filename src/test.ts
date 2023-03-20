import createServer from './localeServer';

import { Logger, mergeOption } from './utils/utils'

const path = require('path');

let readConfigFlag = {};
try {
  Logger.success('读取locales.config成功');
  readConfigFlag = require(path.join(process.cwd(), 'locales.config.js'));
} catch (error) {
  Logger.warning('没有默认的配置文件locales.config.json');
}

const mergeConfig = mergeOption(readConfigFlag, {});

createServer(mergeConfig);

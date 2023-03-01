const path = require('path');
const createServer = require('../src/localeServer');
const { Logger, mergeOption } = require('./utils/utils');
const langConfig = {
  directory: 'src/testdir',
  lang: 'zh-CN,zh-TW,en-US',
  path: '1',
  ext: '[.js|.jsx|.ts|.tsx]',
  outputPath: 'src/locales',
};
let readConfigFlag = { ignores: ['node_modules'] };
try {
  readConfigFlag = require(path.join(process.cwd(), 'locales.config.json'));
  Logger.success('读取locales.config成功');
} catch (error) {
  Logger.warning('没有默认的配置文件locales.config.json');
  // Logger.warning('使用默认的配置');
}

const mergeConfig = mergeOption(readConfigFlag, langConfig);
console.log(langConfig, '----', mergeConfig.ignores, [44]);
return;
createServer(mergeConfig);

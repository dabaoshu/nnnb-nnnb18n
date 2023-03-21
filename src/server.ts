#! /usr/bin/env node
import { program } from 'commander'
import { mergeOption, tryReadFilebyParentDir } from './utils/utils';
import createServer from './localeServer'
import config from './utils/config'
import { globalLog } from './utils/Logger'
import path from 'path'
import fs from 'fs'
const pkg = require(path.join(__dirname, '../', 'package.json'));
program.name('locales').version(pkg.version).description('启动本地翻译服务');
const usageList = [];
Object.entries(config).forEach(
  ([key, { option, description, default: def, usage }]) => {
    program.option(option, description, def);
    usageList.push(usage);
  }
);
program.on('--help', function () {
  console.log('\r\nExamples');
  usageList.forEach((usage) => console.log('  ' + usage));
});
program.parse(process.argv);

let existRootConfig = {}
try {
  const targetPath = tryReadFilebyParentDir("locales.config.js", process.cwd())
  console.log("targetPath", targetPath);

  existRootConfig = require(path.resolve(targetPath))
} catch (error) {
  globalLog.warning(error);
  globalLog.info('沒有找到项目的locales.config.js配置,则使用默认配置')
}
console.log("existRootConfig", existRootConfig);

const langConfig = program.opts(); // 启动服务所需要的信息
const mergeConfig = mergeOption(existRootConfig, langConfig);
createServer(mergeConfig);

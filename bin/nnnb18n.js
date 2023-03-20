#! /usr/bin/env node
const { program } = require('commander');
const { Logger, mergeOption } = require('../lib/utils/utils');
const createServer = require('../lib/localeServer').default
const pkg = require('../package.json');
const config = require('./config');
const path = require('path')
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

let readConfigFlag = {}
try {
  readConfigFlag = require(path.join(__dirname, '../', 'locales.config.js'));
  Logger.success('读取locales.config成功');
} catch (error) {
  Logger.warning('没有默认的配置文件locales.config.json');
}


const langConfig = program.opts(); // 启动服务所需要的信息
const mergeConfig = mergeOption(readConfigFlag, langConfig);
console.log(mergeConfig);
createServer(mergeConfig);

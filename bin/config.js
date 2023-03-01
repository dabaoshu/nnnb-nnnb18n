const path = require('path');
module.exports = {
  // commander来进行实现  option / commander
  directory: {
    option: '-d, --directory <dir>',
    description: '请设置你的文件夹的启动地址',
    default: process.cwd(),
    usage: 'locales --directory <dir string>',
  },
  language: {
    option: '-lang, --lang [string]',
    description: '生成的语言模板 暂时支持zh-CN,Zh-TW,en-US',
    default: 'zh-CN,zh-TW,en-US',
    usage: 'locales --lang',
  },
  path: {
    option: '-p, --path [number]',
    description: 'directory是相对路径还是根路径 值为1为相对路径',
    default: '0',
    usage: 'locales --p',
  },
  ext: {
    option: '-ext, --ext [.js|.jsx|.ts|.tsx]',
    description: 'ext 需要解析文件的后缀名',
    default: '[.js|.jsx|.ts|.tsx]',
    usage: 'locales --p',
  },
  outPut: {
    option: '--output-path [string]',
    description: '解析后的输出的文件夹',
    default: path.join(process.cwd(), 'locales'),
    usage: 'locales --output-path [dir string]',
  },
};

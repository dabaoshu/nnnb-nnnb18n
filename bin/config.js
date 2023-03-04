const path = require('path');
module.exports = {
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
  ext: {
    option: '-ext, --ext [.js|.jsx|.ts|.tsx]',
    description: 'ext 需要解析文件的后缀名',
    default: '[.js|.jsx|.ts|.tsx]',
    usage: 'locales --ext',
  },
  outPut: {
    option: '--output-path [string]',
    description: '解析后的输出的文件夹',
    default: path.join(process.cwd(), 'locales'),
    usage: 'locales --output-path [dir string]',
  },
  single: {
    option: '--single',
    description: '解析后的输出的是否是统一文件',
    default: false,
    usage: 'locales --single [number]',
  },
};

import path from "path"
import cnchars from 'cn-chars'
// import ignore from 'ignore'
import fs from 'fs'
import { getFiles, Logger, getAbsolutePath } from '../utils/utils'
import {
  formatMessageRegexpAll,
  formatMessageRegexp,
  LogMessage,
  fileExts,
} from './const'

const creatTemplate = (zipMap: Map<string, string>) => {
  let content = '';
  zipMap.forEach((val, key) => {
    content = `${content}\n  "${key}": "${val}", `;
  });
  const _content = `export default {${content}
}`;
  return _content;
};

const translateDocBylang = {
  'zh-CN'(server) {
    const content = creatTemplate(server.zipMap);
    server.langMap.set('zh-CN', content);
  },
  'zh-TW'(server) {
    const twMap = new Map();
    const transLang = (str) => {
      const _str = [...str].map((i) => cnchars.toTraditionalChar(i)).join('');
      return _str;
    };
    server.zipMap.forEach((val, key) => {
      twMap.set(key, transLang(val));
    });
    const content = creatTemplate(twMap);
    server.langMap.set('zh-TW', content);
  },
  'en-US'(server) {
    Logger.warning('中文翻译英语需要设置翻译秘钥，暂不提供');
    const content = creatTemplate(server.zipMap);
    server.langMap.set('en-US', content);
  },
};
/**
 * LocalesServer
 * {options} 服务配置
 * {translateDoc} 服务自定义翻译方法
 */
class LocalesServer {
  single: boolean
  lang: string[]
  inputPath: string
  outputPath: string
  fileMap: Map<string, { [key: string]: any }>
  zipMap: Map<string, string>
  langMap: Map<string, string>
  _translateDocBylang: { [key: string]: (sever: LocalesServer) => void }
  options: any
  constructor(options, translateDoc = {}) {
    this.options = options;
    this.single = options.single; //boolean 是否输出为单个locales文件
    this.lang = (options.lang || '').split(','); // 需要翻译的语言
    this.inputPath = getAbsolutePath(options.directory); // 输入文件夹
    this.outputPath = getAbsolutePath(options.outputPath); // 输出文件夹
    this.fileMap = new Map();
    this.zipMap = new Map(); // 原始模板的key value
    this.langMap = new Map(); // zh cn => content
    this._translateDocBylang = { ...translateDocBylang, ...translateDoc };
    // this.matchMetal = options.matchMetal // 翻译对象
  }

  start = () => {
    this.read();
  };

  _parse = (content = '') => {
    let localeObj: any = {};
    const strlist = content.match(formatMessageRegexpAll);
    if (strlist) {
      strlist.forEach((str, i) => {
        const matchRes = str.match(formatMessageRegexp)[1]
        const functionStr = `
          const a ={ ${matchRes} }
          return a
        `;
        const a = new Function(functionStr);
        const { id, defaultMessage } = a();
        localeObj[id] = defaultMessage;
      });
      return localeObj;
    }
    return {};
  };

  translateDoc = () => {
    Logger.info('开始翻译');
    try {
      // 把所有文件里面所有的id value 存入zipMap
      // todo 后续是否可增加选项来支持按文件切割
      this.fileMap.forEach((localeObj) => {
        Object.keys(localeObj).forEach((key) => {
          const initVal = localeObj[key];
          if (this.zipMap.has(key)) {
          } else {
            this.zipMap.set(key, initVal);
          }
        });
      });
      this.lang.forEach((lang) => {
        if (this._translateDocBylang[lang]) {
          this._translateDocBylang[lang](this);
        } else {
          Logger.warning(`暂不支持${lang}语言`);
        }
      });
      Logger.info('翻译结束，开始创建locals');
      this.write();
    } catch (error) {
      Logger.error('收集信息错误', error);
    }
  };

  // 识别文件的id value
  compiler(file: string) {
    const flieExt = path.extname(file);
    if (fileExts.includes(flieExt)) {
      Logger.info('讀取文件：', file);
      const content = fs.readFileSync(file, 'utf8');
      const localeObj = this._parse(content);
      this.fileMap.set(file, localeObj);
    }
  }

  // 获取到文件下所有的文件
  read = () => {
    Logger.info('开始读取');
    try {
      const allFiles = getFiles(this.inputPath, []);
      allFiles.forEach((file) => {
        this.compiler(file);
      });
      Logger.success('读取完成');
      this.translateDoc();
    } catch (error) {
      Logger.error(LogMessage.fileRead, error);
    }
  };

  write = () => {
    Logger.info('开始写入文件');
    try {
      let isExisits = fs.existsSync(this.outputPath);
      if (!isExisits) fs.mkdirSync(this.outputPath);
      this.langMap.forEach((content, lang) => {
        fs.writeFileSync(path.join(this.outputPath, `${lang}.js`), content);
      });
      Logger.success('写入文件成功');
    } catch (error) {
      Logger.error(LogMessage.fileWrite, error);
    }
  };
}


export default function createServer(config) {
  Logger.info('正在启动服务');
  console.log(config);

  const localesServer = new LocalesServer(config);
  localesServer.start();
  Logger.info('服务结束');
};


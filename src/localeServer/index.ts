import path from "path";
import fs from "fs";
import { getFiles, getAbsolutePath } from "../utils/utils";
import { globalLog, Logger, LogMessage } from "../utils/Logger";
import {
  formatMessageRegexpAll,
  formatMessageRegexp,
  fileExts,
} from "./const";
import { translate } from "./translator";

/**
 * LocalesServer
 * {options} 服务配置
 * {translateDoc} 服务自定义翻译方法
 */
export class LocalesServer {
  ServerLog: Logger
  single: boolean;
  lang: string[];
  inputPath: string;
  outputPath: string;
  exclude: string[];
  fileMap: Map<string, { [key: string]: any }>;
  zipMap: Map<string, string>;
  langMap: Map<string, string>;
  _translateDocBylang: { [key: string]: (sever: LocalesServer) => void };
  options: any;
  constructor(options, _translate = translate) {
    this.ServerLog = new Logger()
    this.ServerLog.openLog = options.openLog
    this.options = options;
    this.single = options.single; //boolean 是否输出为单个locales文件
    this.lang = (options.lang || "").split(","); // 需要翻译的语言
    this.inputPath = getAbsolutePath(options.directory); // 输入文件夹
    this.outputPath = getAbsolutePath(options.outputPath); // 输出文件夹
    this.fileMap = new Map();
    this.zipMap = new Map(); // 原始模板的key value
    this.langMap = new Map(); // zh cn => content
    this.exclude = options.exclude || [];
    this._translateDocBylang = _translate || translate;
  }

  start = () => {
    this.read();
  };

  private _parse = (content = "") => {
    let localeObj: any = {};
    const strlist = content.match(formatMessageRegexpAll);
    if (strlist) {
      strlist.forEach((str, i) => {
        const matchRes = str.match(formatMessageRegexp)[1];
        const functionStr = `
          return { ${matchRes} }
        `;
        const a = new Function(functionStr);
        const { id, defaultMessage } = a();
        localeObj[id] = defaultMessage ? defaultMessage : id
      });
      return localeObj;
    }
    return {};
  };

  translateDoc = async () => {
    this.ServerLog.info("开始翻译");
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
      await Promise.all(
        this.lang.map(async (lang) => {
          if (this._translateDocBylang[lang]) {
            await this._translateDocBylang[lang](this);
          } else {
            this.ServerLog.warning(`暂不支持${lang}语言`);
          }
        })
      );
      this.write();
      this.ServerLog.info("翻译结束，开始创建locals");
    } catch (error) {
      console.error(new Error(error));
      this.ServerLog.error("收集信息错误");
    }
  };

  // 识别文件的id value
  compiler(file: string) {
    const flieExt = path.extname(file);
    if (fileExts.includes(flieExt)) {

      this.ServerLog.info("讀取文件：", file);
      const content = fs.readFileSync(file, "utf8");
      const localeObj = this._parse(content);
      this.fileMap.set(file, localeObj);
    }
  }

  // 获取到文件下所有的文件
  read = () => {
    this.ServerLog.info("开始读取");
    try {
      const allFiles = getFiles(this.inputPath, [], this.exclude);
      allFiles.forEach((file) => {
        this.compiler(file);
      });
      this.ServerLog.success("读取完成");
      this.translateDoc();
    } catch (error) {
      this.ServerLog.error(LogMessage.fileRead, error);
    }
  };

  write = () => {
    this.ServerLog.info("开始写入文件");
    try {
      let isExisits = fs.existsSync(this.outputPath);
      if (!isExisits) fs.mkdirSync(this.outputPath);
      this.langMap.forEach((content, lang) => {
        fs.writeFileSync(path.join(this.outputPath, `${lang}.js`), content);
      });
      this.ServerLog.success("写入文件成功");
    } catch (error) {
      this.ServerLog.error(LogMessage.fileWrite, error);
    }
  };
}

export default function createServer(config) {
  globalLog.info("正在启动服务");
  let localesServer = new LocalesServer(config);
  localesServer.start();
  globalLog.info("服务结束");
}

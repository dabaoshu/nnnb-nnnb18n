import cnchars from 'cn-chars'
import md5 from '../utils/md5';
import fetch, { RequestInit } from 'node-fetch';
import { Logger } from '../utils/utils';
import path from 'path';
import fs from 'fs';
interface TranslateOptions {
  from?: string;
  to?: string;
  fetchOptions?: Partial<RequestInit>;
}

let isExisits = fs.existsSync(path.join(process.cwd(), 'locales.config.js'));
let readConfigFlag = isExisits ? require(path.join(process.cwd(), 'locales.config.js')) : {}
console.log("readConfigFlag", readConfigFlag);



export class BaiduTranslator {
  protected options: TranslateOptions;
  constructor(options?: TranslateOptions) {
    this.options = { ...options }
  }

  async translate() {
    this.buildUrl({ query: 'apple' }).then(res => {
      console.log(res);
    }).catch(rej => {
      console.log(rej);

    })
  }

  protected buildUrl(options: { query: string }) {
    const { query } = options
    const { from = "en", to = "zh", } = this.options
    const url = `http://api.fanyi.baidu.com/api/trans/vip/translate`
    var salt = (new Date).getTime();
    const appid = 20230228001579871
    const key = 'zGxPV2lJH5iw7RYNN8s1'
    var str1 = appid + query + salt + key;
    const sign = md5(str1);
    return fetch(url, {
      method: 'GET',
      body: {
        q: query,
        appid: appid,
        salt: salt,
        from: from,
        to: to,
        sign: sign
      }
    })
  }


  protected buildFetchOptions() {

  }

  buildError() {
    Logger.error('错误')
  }

}



const creatTemplate = (zipMap: Map<string, string>) => {
  let content = '';
  zipMap.forEach((val, key) => {
    content = `${content}\n  "${key}": "${val}", `;
  });
  const _content = `export default {${content}
}`;
  return _content;
};

export const translate = {
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
    const content = creatTemplate(server.zipMap);
    const baiduTranslate = new BaiduTranslator({ from: 'en', to: 'zh', fetchOptions: {} })
    baiduTranslate.translate()
    server.langMap.set('en-US', content);
  },
};
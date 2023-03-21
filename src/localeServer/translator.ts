import { globalLog } from './../utils/Logger';
import cnchars from "cn-chars";
import md5 from "../utils/md5";
import axios from "axios";
import type { LocalesServer } from ".";

interface TranslateOptions {
  from?: string;
  to?: string;
  [key: string]: any;
}

interface BaiduOption extends TranslateOptions {
  fetchOptions?: {
    appid: string;
    secret: string;
  };
}

export class BaiduTranslator {
  protected options: BaiduOption;
  constructor(options?: BaiduOption) {
    this.options = { ...options };
  }

  async translate(input: string) {
    return new Promise((resolve, reject) => {
      this.buildUrl(input).then((res) => {
        const { data, status } = res;
        if (status === 200) {
          resolve(data.trans_result);
        } else {
          reject(res);
        }
      });
    });
  }

  createUrl = (domain, form) => {
    let result = domain + "?";
    for (let key in form) {
      result += `${key}=${form[key]}&`;
    }
    return result.slice(0, result.length - 1);
  };

  protected buildUrl(query) {
    const { from = "en", to = "zh", fetchOptions } = this.options;
    const url = `http://api.fanyi.baidu.com/api/trans/vip/translate`;
    var salt = new Date().getTime();
    const { appid, secret } = fetchOptions;
    const sign = md5(`${appid}${query}${salt}${secret}`);
    const body = {
      q: encodeURIComponent(query),
      appid: appid,
      salt: salt,
      from: from,
      to: to,
      sign: sign,
    };
    const newurl = this.createUrl(url, body);
    return axios.get(newurl);
  }
  protected buildFetchOptions() {}
}

const clearQuotation = (val: string, key) => {
  const QuotationRegex = /^['"`]([\s\S]+?)['"`]$/gm;
  const isnext = QuotationRegex.test(val);
  //
  // if (typeof val === "string") {
  // 巨坑 // 这里用了之后就不执行
  // if (QuotationRegex.test(val)) {
  try {
    const _val = val.replace(QuotationRegex, ($1, $2) => $2);
    return isnext ? clearQuotation(_val, key) : _val;
  } catch (error) {
    console.log(key, val, error);
  }
  // }
  // } else {
  //   return "";
  // }
};

const creatTemplate = (zipMap: Map<string, string>) => {
  let content = "";
  zipMap.forEach((val, key) => {
    const _val = clearQuotation(val, key);
    content = `${content}\n  "${key}": \`${_val}\`, `;
  });
  const _content = `export default {${content}
}`;
  return _content;
};

export const translate = {
  "zh-CN"(server) {
    const content = creatTemplate(server.zipMap);
    server.langMap.set("zh-CN", content);
  },
  "zh-TW"(server) {
    const twMap = new Map();
    const transLang = (str) => {
      const _str = [...str].map((i) => cnchars.toTraditionalChar(i)).join("");
      return _str;
    };
    server.zipMap.forEach((val, key) => {
      twMap.set(key, transLang(val));
    });
    const content = creatTemplate(twMap);
    server.langMap.set("zh-TW", content);
  },
  async "en-US"(server: LocalesServer) {
    if (!(server.options.baiduAppId&&server.options.baiduKey)) {
      globalLog.warning("未接入百度的接口")
      globalLog.warning("翻译en跳过")
      return 
    }
    const enMap = new Map();
    const baiduTranslate = new BaiduTranslator({
      from: "zh",
      to: "en",
      fetchOptions: {
        // @ts-ignore
        appid: server.options.baiduAppId,
        secret: server.options.baiduKey,
      },
    });
    const sliceWords = Array.from(server.zipMap.values()).map((v) => `"${v}"`);
    const slicekeyWords = Array.from(server.zipMap.keys());
    const streamSize = 20;
    const fetchs = [];
    let idx = 0;
    while (idx < sliceWords.length) {
      const words = sliceWords.slice(idx, idx + streamSize);
      const query = words.join(` \n `);
      fetchs.push(() => baiduTranslate.translate(query));
      idx += streamSize;
    }
    const transValues: { fromValue: string; toValue: string }[] = [];
    try {
      const ress = await Promise.all(fetchs.map((fn) => fn()));
      ress.forEach((resData) => {
        resData.forEach(({ dst, src }) => {
          transValues.push({ fromValue: src, toValue: dst });
        });
      });
      slicekeyWords.forEach((key, i) => {
        const { toValue } = transValues[i];
        enMap.set(key, toValue);
      });
    } catch (error) {
      globalLog.error('翻译接口返回错误,请')
    }
    const content = creatTemplate(enMap);
    server.langMap.set("en-US", content);
  },
};

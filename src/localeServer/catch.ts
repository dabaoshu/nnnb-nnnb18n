import https from 'https';
import { load } from 'cheerio';

https.get('https://fanyi.baidu.com/', (res) => {
  // 分段返回的 自己拼接
  let html = '';
  // 有数据产生的时候 拼接
  res.on('data', function (chunk) {
    html += chunk;
  })
  // 拼接完成
  res.on('end', function () {
    const $ = load(html)
    // console.log("html,",html);
    // $('script').filter(e=>)
    console.dir($('script').toArray().map((script, i) => {
      console.log("script,第", i, script.children);
      return script
    }));

  })
})
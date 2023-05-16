# nnnb-nnnb18n
umi国际化提取
觉得有帮助的话请给一个star支持一下
###### 通过脚本把 指定文件下的所有 formatMessage方法转换为locales下的json对象
```javascript
import { formatMessage } from 'umi/locale';
const a=formatMessage({
      id: 'user.login.tip',
      defaultMessage: '请登录',
  })
```
###### 转换为
```javascript
//zh-CN
export default {
  "user.login.tip": "请登录",
}
//zh-TW
export default {
  "user.login.tip": "請登入",
}
//en-US 由于需要对接云端的一些翻译api 需要配acces key 
export default {
  "user.login.tip": "Please login",
}
```
### 使用说明 

##### 安装说明
1. **在项目中使用**可以配置json文件来做到一些文件过滤之类的属性 做到项目级统一规范 这种需要是安装到项目级别下 可以通过在项目根目录下配置文件 locales.config.js 可通过 defineLocalesConfig 来做一些提示说明
```js
const { defineLocalesConfig } = require('@nnnb/nnnb18n')
// 建议注册百度翻译api 自己配置自己的
module.exports = defineLocalesConfig({
  baiduAppId: "xxxxx",
  baiduKey: "xxxx",
})
```
2. 如果**不在项目中使用** 可以不在项目中安装依赖使用的话 可以选择全局安装 在项目的上一级文件夹配置locales.config.js **此时不能再使用 defineLocalesConfig来进行辅助配置**

##### 终端使用说明
**推荐在终端使用 简单方便**
* 1.使用命令行 如 nnnb18n [-d <文件夹>]



##### 敬请期待 todo 
后续支持可配置式的函数名,理论支持所有的国际化翻译,还需要做
如
```javascript
  const funcName='local'
  const params='id,name'
  // 则解析 方法为
  local("user.login.tip","请登录")
```
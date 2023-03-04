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
//en-US 由于需要对接云端的一些翻译api 需要配置acces key 此处暂时还需要人工去翻译
export default {
  "user.login.tip": "Please login",
}
```
#### 使用说明 会支持两种使用方式
区别在于 默认属性的支持度不一样
项目级可以配置json文件来做到一些文件过滤之类的属性
终端命令式 在于简单方便
##### 1.在终端使用命令行 如 nnnb18n -d <文件夹>
   
##### 1.使用命令行 如 nnnb18n -d <文件夹>
##### 敬请期待 todo 
后续支持可配置式的函数名
如
```javascript
  const funcName='local'
  const params='id,name'
  // 则解析 方法为
  local("user.login.tip","请登录")
```
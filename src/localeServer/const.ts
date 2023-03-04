const formatMessageRegexp =
  /formatMessage\s*\(\s*\{\s*((id\s*:\s*['"`][\w.-]+['"`])\s*,?\s*(defaultMessage\s*:\s*["'`][\s\S]+?["'`])?)\s*,?\s*\}\s*\)/;

const formatMessageRegexpAll = new RegExp(formatMessageRegexp, 'gm');

const LogMessage = {
  fileRead: '文件读取错误',
  fileWrite: '文件写入错误',
  regexp: '字符匹配错误',
};
const fileExts = ['.ts', '.js', '.jsx', '.tsx'];

const matchMetal = {
  matchAll: formatMessageRegexpAll,
  match: formatMessageRegexp
}

export {
  formatMessageRegexpAll,
  formatMessageRegexp,
  LogMessage,
  fileExts,
}

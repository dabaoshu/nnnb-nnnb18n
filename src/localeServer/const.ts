const formatMessageRegexp =
  /formatMessage\s*\(\s*\{\s*((id\s*:\s*['"`][\w.-]+['"`])\s*,?\s*(defaultMessage\s*:\s*["'`][\s\S]+?["'`])?)\s*,?\s*\}\s*\)/;

const formatMessageRegexpAll = new RegExp(formatMessageRegexp, 'gm');


const fileExts = ['.ts', '.js', '.jsx', '.tsx'];

const matchMetal = {
  matchAll: formatMessageRegexpAll,
  match: formatMessageRegexp
}

export {
  formatMessageRegexpAll,
  formatMessageRegexp,
  fileExts,
}

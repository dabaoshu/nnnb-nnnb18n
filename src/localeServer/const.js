const formatMessageRegexp =
  /formatMessage\s*\(\s*\{\s*((id\s*:\s*['"`][\w.-]+['"`])\s*,?\s*(defaultMessage\s*:\s*["'`][\s\S]+?["'`])?)\s*,?\s*\}\s*\)/;

const formatMessageRegexpAll = new RegExp(formatMessageRegexp, 'gm');

const defaultIgnores = ['node_modules'];
module.exports = {
  formatMessageRegexpAll,
  formatMessageRegexp,
  defaultIgnores,
};

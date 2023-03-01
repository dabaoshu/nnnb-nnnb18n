const idChapt = /id\s*:\s*['"`][\w.-]+['"`]/;
const defaultMessageChapt = /defaultMessage\s*:\s*["'`][\s\S]+?["'`]/;
const removeRegexo = (reg) => {
  const str = reg.toString();
  const newStr = [];
  return newStr;
};

const testStr = `formatMessage( {
  id:"11-212121" ,

  defaultMessage:\`12
  121的2111{埃安}
  121121 \`
  })
  formatMessage( {
  id:"11-212121" ,
  })1
  {
  "11-212121我的":"12121"
  }11;`;

const strlist = testStr.match(formatMessageRegexpAll);
// console.log(strlist);
strlist.forEach((str, i) => {
  const matchRes = str.match(formatMessageRegexp)[1];
  // console.log(i,matchRes);
  const functionStr = `
    const a ={ ${matchRes} }
    return a
  `;
  const a = new Function(functionStr);

  const { id, defaultMessage } = a();
});
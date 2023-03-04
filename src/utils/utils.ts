import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
export function getFiles(dirPath, fileList = [], ignores = []) {
  const stat = fs.statSync(dirPath);
  if (stat.isDirectory()) {
    //判断是不是目录
    const dirs = fs.readdirSync(dirPath);
    dirs.forEach((_dirPath) => {
      getFiles(path.join(dirPath, _dirPath), fileList);
    });
  } else if (stat.isFile()) {
    //判断是不是文件
    fileList.push(dirPath);
  }
  return fileList;
}

export class Logger {
  static log(...arg) {
    console.log(...arg);
  }
  static success(...arg) {
    console.log(chalk.green(...arg));
  }
  static info(...arg) {
    console.log(chalk.cyan(...arg));
  }
  static error(...arg) {
    console.log(chalk.red(...arg));
  }
  static warning(...arg) {
    console.log(chalk.yellow(...arg));
  }
}


export const mergeOption = (defaultOptions, options) => {
  Object.keys(defaultOptions).forEach((name) => {
    if (defaultOptions[name] && typeof defaultOptions[name] == 'object') {
      // 如果是数组直接返回相应对象就好了
      if (Array.isArray(defaultOptions[name])) {
        options[name] = options[name] || defaultOptions[name];
      }
      const value = mergeOption(defaultOptions[name], options[name] || {});
      options[name] = value;
    } else if (
      options[name] === undefined &&
      defaultOptions[name] !== undefined
    ) {
      options[name] = defaultOptions[name];
    }
  });
  return options;
};

export const getAbsolutePath = (_path) => {
  return path.isAbsolute(_path) ? _path : path.join(process.cwd(), _path);
};



// export default {
//   getFiles, Logger, mergeOption, getAbsolutePath
// }
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
function getFiles(dirPath, fileList = [], ignores = []) {
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

class Logger {
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

/**
 * Write the locale file
 * @param {{key: string, originalDefaultMessage: string, transformedDefaultMessage: string}[]} messages
 * @param {string} filePath
 */
function writeFile(messages, filePath) {
  logger.info('Writing file:', filePath);
  try {
    const directoryPath = pathTool.dirname(filePath);
    const sourceObj = {};
    (messages || []).forEach((item) => {
      sourceObj[item.key] = item.transformedDefaultMessage;
    });
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(sourceObj, null, 2));
  } catch (error) {
    logger.error('Failed to write file', error.toString());
  }
  logger.success('Successd to write file.');
}

const mergeOption = (defaultOptions, options) => {
  Object.keys(defaultOptions).forEach((name) => {
    if (defaultOptions[name] && typeof defaultOptions[name] == 'object') {
      const value = mergeOption(defaultOptions[name], options[name] || {});
      console.log(name,value);
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

module.exports = { getFiles, Logger, writeFile, mergeOption };

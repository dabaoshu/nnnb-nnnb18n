import chalk from 'chalk';

export class Logger {
  openLog = true
  log(...arg) {
    if (this.openLog) {
      console.log(...arg);
    }
  }
  success(...arg) {
    if (this.openLog) {
      console.log(chalk.green(...arg));
    }
  }
  info(...arg) {
    if (this.openLog) {
      console.log(chalk.cyan(...arg));
    }
  }
  error(...arg) {
    if (this.openLog) {
      console.log(chalk.red(...arg));
    }
  }
  warning(...arg) {
    if (this.openLog) {
      console.log(chalk.yellow(...arg));
    }
  }
}

export const LogMessage = {
  fileRead: '文件读取错误',
  fileWrite: '文件写入错误',
  regexp: '字符匹配错误',
};


export const globalLog = new Logger()
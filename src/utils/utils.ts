import fs from 'fs';
import path from 'path';
import os from 'os'
import ignore from 'ignore';
export function getFiles(dirPath, fileList = [], ignores = []) {
  const ig = ignore().add(ignores)
  const stat = fs.statSync(dirPath);
  if (stat.isDirectory()) {
    //判断是不是目录
    const dirs = fs.readdirSync(dirPath);
    dirs.forEach((_dirPath) => {
      if (!ig.ignores(_dirPath)) {
        getFiles(path.join(dirPath, _dirPath), fileList);
      }
    });
  } else if (stat.isFile()) {
    //判断是不是文件
    fileList.push(dirPath);
  }
  return fileList;
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

export const getProjectRoot = (_path: string) => {
  return path.join(process.cwd(), _path)
}

export const getAbsolutePath = (_path) => {
  return path.isAbsolute(_path) ? _path : path.join(process.cwd(), _path);
};


interface LocalesConfig {
  exclude: string[];
  directory: string;
  lang: string;
  ext: string;
  outputPath: string;
  baiduAppId: string;
  baiduKey: string;
  openLog: boolean;
}

export const defineLocalesConfig = (config: Partial<LocalesConfig>) => {
  const defaultConfig = {
    exclude: ["node_modules", "git", "dist"],
    directory: "",
    lang: "zh-CN,zh-TW,en-US",
    ext: "[.js|.jsx|.ts|.tsx]",
    outputPath: "locales",
    openLog: false
  }
  return mergeOption(defaultConfig, config)
}
export const readParentDir = (currentpath) => {
  console.log(path.dirname(currentpath));
}

// 自下而上的读取文件夹来找到最近的文件
export const tryReadFilebyParentDir = (fileName, currentPath) => {
  const targetPath = path.resolve(currentPath, fileName)
  const stat = fs.existsSync(targetPath)
  if (stat) return targetPath
  const ParentDir = path.dirname(currentPath)
  if (ParentDir === currentPath) throw new Error().name=`已查找到最顶级目录还是找不到${fileName}文件,在${currentPath}下`;
  return tryReadFilebyParentDir(fileName, ParentDir)
}


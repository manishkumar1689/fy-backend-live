import * as fs from 'fs';
import * as path from 'path';
import * as lineByLine from 'n-readlines';
import { ephemerisPath } from '../../.config';
import fileValues from './settings/file-values';
import { buildFullPath } from '../../lib/files';
import { notEmptyString } from '../../lib/validators';



/*
@param path:string
@return string
*/
const fetchFirstLines = path => {
  let lines = [];
  const liner = new lineByLine(path);
  const yearRgx = /\b(19|20)\d\d\b/;
  let line;
  let lineNumber = 0;
  let strLine = '';
  let yearMatched = false;
  while ((line = liner.next())) {
    strLine = line.toString('ascii');
    if (strLine.length > 7) {
      lines.push(strLine);
      if (yearRgx.test(strLine)) {
        yearMatched = true;
        break;
      }
    }
    lineNumber++;
    if (lineNumber > 6) {
      break;
    }
  }
  if (!yearMatched) {
    lines = lines.length > 0 ? lines.splice(0, 1) : [];
  }
  return lines.length > 0 ? lines.join('\n') : null;
};

/*
@param fn:string
@return Object
*/
export const getFileData = fn => {
  const path = fs.existsSync(fn) ? fn : '';
  let iSize = 0;
  let modified = '';
  let isDir = false;
  let copyLine = null;
  if (path.length > 0) {
    const stats = fs.statSync(path);
    const { mtime, size } = stats;
    isDir = stats.isDirectory();
    if (mtime instanceof Date) {
      modified = mtime.toISOString();
    }
    if (size) {
      iSize = size;
    }
    if (iSize > 32 && !isDir) {
      copyLine = fetchFirstLines(path);
    }
  }
  if (isDir) {
    return { path, isDir };
  } else {
    return {
      path,
      modified,
      size: iSize,
      isDir,
      copyLine,
    };
  }
};

export const deleteSwissEpheFile = (fn: string, subDir = '') => {
  const fullPath = buildFullPath(fn, 'swisseph', subDir);
  let isRemoved = false;
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    isRemoved = true;
  }
  return isRemoved;
};

/*
@param directoryPath:string
@return Array<Object>
*/
const readDataFilesSync = (directoryPath: string, subDir = '') => {
  let files = [];
  const fullPath = notEmptyString(subDir, 1)
    ? path.resolve(directoryPath + '/' + subDir)
    : directoryPath;
  if (fs.existsSync(fullPath)) {
    files = fs.readdirSync(fullPath);
  }
  return files
    .filter(fn => !fn.startsWith('.'))
    .map(fn => {
      const fp = [fullPath, fn].join('/');
      const fd = getFileData(fp);
      const file = fd.path.split('/').pop();
      if (fd.isDir) {
        const children = readDataFilesSync(fp, subDir);
        fd.size = children.map(cf => cf.size).reduce((a, b) => a + b, 0);
        return { ...fd, file, children };
      } else {
        let infoItem = fileValues.find(fi => fi.file === file);
        if (!infoItem) {
          infoItem = {
            file,
            info: '',
            yearRange: [0, 0],
          };
        }
        return { ...fd, ...infoItem };
      }
    });
};

/*
@param directoryPath:string
@return Promise<Array<Object>>
*/
export const readDataFiles = async (directoryPath: string, subDir = '') => {
  return readDataFilesSync(directoryPath, subDir);
};

/*
 * return Promise<Array<Object>>
 */
export const readEpheFiles = async (subDir = '') => {
  return await readDataFiles(ephemerisPath, subDir);
};

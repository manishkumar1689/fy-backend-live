import { spawn } from 'child_process';
import * as fs from 'fs';
import {
  mongo,
  backupPath,
  exportDirectory,
  mediaDirectory,
  filesDirectory,
} from '../.config';
import { buildFullPath } from './files';
import { notEmptyString } from './validators';

interface FileDetails {
  name: string;
  isDirectory: boolean;
  size: number;
  ctime: Date;
  mtime: Date;
}

interface DirectoryDetails {
  valid: boolean;
  path: string;
  files: FileDetails[];
  size: number;
  numRefs: number;
}

const optionParam = (name: string, value: string) => {
  return '--' + name + '=' + value;
};

const buildOptionParams = (pairs: string[][]): string[] => {
  return pairs
    .filter(pair => pair.length > 1)
    .map(pair => optionParam(pair[0], pair[1]));
};

export const fetchFileInfo = path => {
  const filename = path.split('/').pop();
  const stats = fs.lstatSync(path);
  return {
    name: filename,
    isDirectory: stats.isDirectory(),
    size: stats.size,
    ctime: stats.ctime,
    mtime: stats.mtime,
  };
};

const buildFileData = async (
  path: string,
  filename: string,
): Promise<FileDetails> => {
  const fp = [path, filename].join('/');
  return fetchFileInfo(fp);
};

const dateTimeSuffix = () => {
  const suffix = new Date()
    .toISOString()
    .split('.')
    .shift()
    .replace(/[^0-9T]/g, '')
    .replace(/T/, '_');
  return '_' + suffix;
};

export const exportCollection = (
  collection = '',
  format = 'json',
  addDate = false,
) => {
  const suffix = addDate ? dateTimeSuffix() : '';
  const outFile = buildFullPath(collection + suffix + '.' + format, 'backups');

  const baseCmd = 'mongoexport';
  const args = buildOptionParams([
    ['db', mongo.name],
    ['username', mongo.user],
    ['password', mongo.pass],
    ['collection', collection],
    ['type', format],
  ]);
  if (format === 'json') {
    args.push('--jsonArray');
  }
  args.push(optionParam('out', outFile));

  spawn(baseCmd, args);
  return outFile;
};

export const matchPath = (type: string) => {
  switch (type) {
    case 'media':
      return mediaDirectory;
    case 'files':
      return filesDirectory;
    case 'exports':
      return exportDirectory;
    default:
      return backupPath;
  }
};

export const listFiles = async (
  directory: string,
): Promise<DirectoryDetails> => {
  const path = matchPath(directory);
  const data = {
    valid: false,
    path,
    files: new Array<FileDetails>(),
    size: 0,
    numRefs: 0,
  };

  if (fs.existsSync(path)) {
    const refs = fs.readdirSync(path);
    if (refs instanceof Array) {
      data.files = [];
      data.numRefs = refs.length;
      for (const fn of refs) {
        if (notEmptyString(fn) && !fn.startsWith('.')) {
          const fd = await buildFileData(path, fn);
          data.files.push(fd);
        }
      }
    }
    data.valid = data.files.length > 0;
    data.size = data.files.map(f => f.size).reduce((a, b) => a + b, 0);
  }
  return data;
};

export const checkFileExists = path => {
  return fs.existsSync(path);
};

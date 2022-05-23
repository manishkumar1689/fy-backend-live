import { spawn } from 'child_process';
import * as fs from 'fs';

export const buildThumbPath = (
  fn,
  params = {
    mode: 'resize',
    width: 640,
    height: 640,
    quality: 90,
  },
) => {
  if (typeof fn === 'string') {
    const { mode, width, height } = params;
    const secs = fn.split('/');
    const filename = secs.pop();
    const prefix = secs.length > 0 ? secs.join('/') + '/' : '';
    const parts = filename.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      if (ext.length < 6) {
        parts.push(mode);
        parts.push(width.toString());
        parts.push(height.toString());
        return prefix + parts.join('-') + '.' + ext;
      }
    }
  }
};

const renderSizeParam = (width: number = 640, height: number = 640) => {
  return width.toString() + 'x' + height.toString();
};

export const resizeImage = (
  fp: string = '',
  params = {
    mode: 'resize',
    width: 640,
    height: 640,
    quality: 90,
  },
  key = "thumb",
  largestKey = "large"
) => {
  const { mode, width, height, quality } = params;
  if (fs.existsSync(fp)) {
    const baseCmd = 'gm';
    const args = ['convert', '-' + mode, renderSizeParam(width, height)];
    if (quality > 0) {
      args.push('-quality');
      args.push(quality.toString());
    }
    args.push(fp);
    const targetPath = key === largestKey ? fp : buildThumbPath(fp, params);
    args.push(targetPath);
    spawn(baseCmd, args);
  }
};

export const rotateImage = (fp: string = '', degrees = 90) => {
  if (fs.existsSync(fp) && degrees % 90 === 0) {
    const baseCmd = 'gm';
    const args = ['convert', '-rotate', degrees.toString(), fp, fp];
    spawn(baseCmd, args);
  }
};

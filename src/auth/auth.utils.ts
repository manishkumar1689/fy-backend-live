import { Request } from 'express';
import { fromBase64 } from '../lib/hash';
import { globalApikey, suffixSplitChars } from '../.config';
import { notEmptyString } from '../lib/validators';
import { authMode, ipWhitelist, pathWhitelist } from '../.config';
import { readRawFile } from '../lib/files';

interface ValidAuthToken {
  valid: boolean;
  uid: string;
}

const base36PartsToHexDec = (str: string): string => {
  return str
    .split('_')
    .map(p => parseInt(p, 36).toString(16))
    .join('');
};

const randomCharsRegex = (chars: string[]) => {
  return new RegExp('[' + chars + ']');
};

const randomCharsSplit = (str: string, chars: string[]) => {
  return str.split(randomCharsRegex(chars));
};

export const fromDynamicKey = (
  str: string,
  checkUid = false,
  minutes = 1440,
): ValidAuthToken => {
  const decrypted = fromBase64(str);
  const firstChar = decrypted.substring(0, 1);
  let uid = '';
  let valid = false;
  if (/^[0-9a-z]$/i.test(firstChar)) {
    const offset = (parseInt(firstChar, 36) % 6) + 2;

    const apiKeyIndex = decrypted.indexOf(globalApikey);
    if (apiKeyIndex === offset) {
      const parts = decrypted.split('__');
      // check userId if required
      if (checkUid && parts.length > 1) {
        uid = parts.pop();
        valid = false;
        const subParts = randomCharsSplit(uid, suffixSplitChars);
        if (subParts.length > 1) {
          const randIntStr = subParts.pop();
          const randInt = parseInt(randIntStr, 36);
          const uid36 = subParts.shift();
          uid = base36PartsToHexDec(uid36);
          valid = !isNaN(randInt);
        }
      } else {
        valid = true;
      }
      const baseStr = parts.join('__');
      const tsParts = baseStr.split(globalApikey);
      const [tsStr, baseSuffix] = randomCharsSplit(
        tsParts.join(''),
        suffixSplitChars,
      );
      if (valid && /^[0-9a-z]+$/i.test(tsStr)) {
        const suffixInt = parseInt(baseSuffix, 36);
        if (!isNaN(suffixInt)) {
          const ts = parseInt(
            tsStr
              .split('')
              .reverse()
              .join(''),
            36,
          );
          const currTs = new Date().getTime();
          const msTolerance = minutes * 60 * 1000;
          const [min, max] = [currTs - msTolerance, currTs + msTolerance];
          valid = ts >= min && ts <= max;
          if (valid && checkUid) {
            valid = uid.length > 20;
          }
        }
      }
    }
  }
  return { valid, uid };
};

export const ipWhitelistFileData = () => {
  const ipWhitelistFileContent = readRawFile('ip-whitelist.txt', 'sources');
  let extraIps: string[] = [];
  if (notEmptyString(ipWhitelistFileContent)) {
    const ipRgx = /^\d+\.\d+\.\d+\.\d+$/;
    extraIps = ipWhitelistFileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => ipRgx.test(line) && ipWhitelist.includes(line) === false);
  }
  return extraIps;
};

export const fetchIpWhitelist = () => {
  const extraIps = ipWhitelistFileData();
  return [...ipWhitelist, ...extraIps];
};

export const maySkipValidation = (request: Request): boolean => {
  let valid = false;
  const { headers } = request;
  const ip = Object.keys(headers).includes('x-real-ip')
    ? headers['x-real-ip'].toString()
    : '0.0.0.0';
  const { path } = request.route;
  const ipOverrides = fetchIpWhitelist();
  const mode =
    ipOverrides.includes(ip) || pathWhitelist.includes(path)
      ? 'skip'
      : authMode.toString();
  switch (mode) {
    case 'skip':
      valid = true;
      break;
  }
  return valid;
};

export const extractFromHeaderToken = (headers, checkUid = false) => {
  const out = { valid: false, uid: '', hasUid: false };
  if (headers instanceof Object) {
    const { token } = headers;
    if (typeof token === 'string') {
      const { valid, uid } = fromDynamicKey(token, checkUid);
      if (!checkUid && valid) {
        out.valid = valid;
      }
      if (checkUid && notEmptyString(uid, 16)) {
        out.uid = uid;
        out.hasUid = true;
      }
    }
  }
  return out;
};

export const extractUidFromResponse = (res = null) => {
  let strUid = '';
  if (res instanceof Object) {
    const { req } = res;
    if (req instanceof Object) {
      const { headers } = req;
      if (headers instanceof Object) {
        const { uid } = headers;
        if (notEmptyString(uid, 12)) {
          strUid = uid;
        }
      }
    }
  }
  return strUid;
};

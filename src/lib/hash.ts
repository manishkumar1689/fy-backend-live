import { hashSalt } from '../.config';
import * as bcrypt from 'bcrypt';
import { notEmptyString } from './validators';

export const encryptPassword = password => {
  return bcrypt.hashSync(password, hashSalt);
};

export const toBase64 = str => Buffer.from(str).toString('base64');

export const fromBase64 = str => Buffer.from(str, 'base64').toString('utf8');

export const generateHash = () =>
  (new Date().getTime() + Math.round(Math.random() * 100) / 100).toString();

export const tokenTo6Digits = (token: string): string => {
  const tokenStr = token.trim().replace(/\s+/g,'');
  const numStr = notEmptyString(tokenStr) && /\d\d\d\d\d\d+/.test(tokenStr)? token.replace(/[^0-9]/g,'') : '';
  const numLen = numStr.length;
  return numStr.length > 3 ? numStr.substr(numStr.length - 6, numLen) : '';
}

export const match6DigitsToken = (token: string, digits = null) => {
  const tokenDigits = tokenTo6Digits(token);
  return tokenDigits === digits;
}

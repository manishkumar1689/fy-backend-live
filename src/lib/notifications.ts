import * as admin from 'firebase-admin';
import { googleFCMKeyPath, googleFCMBase, googleFCMDomain } from '../.config';
import { isNumeric, notEmptyString } from './validators';
import { extractKeyedItemValue } from './converters';
import { CreateFlagDTO } from '../feedback/dto/create-flag.dto';
import { updateLogFile } from './files';

const initApp = () => {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = googleFCMKeyPath;
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${googleFCMBase}.${googleFCMDomain}`,
  });
};

initApp();

export interface IFlag {
  key?: string;
  user: string;
  targetUser?: string;
  value: any;
  type?: string;
  modifiedAt?: string;
  createdAt?: string;
}

export interface UserFlagSet {
  to: IFlag[];
  from: IFlag[];
  likeability: {
    to: IFlag[];
    from: IFlag[];
  };
}

export interface FlagVal {
  key?: string;
  value: any;
  type?: string;
  viewed?: number;
  modifiedAt?: string;
}

export interface FlagResult {
  valid: boolean;
  [key: string]: any;
}

export interface FlagItem {
  key: string;
  value: number | boolean;
  op: string;
}

export const mapUserFlag = (item, toMode = false, likeMode = false): IFlag => {
  if (item instanceof Object) {
    const { key, value, type, user, targetUser, modifiedAt } = item;
    const refUser = toMode ? user : targetUser;
    return likeMode
      ? { value, user: refUser, modifiedAt }
      : { key, type, value, user: refUser, modifiedAt };
  } else {
    return { value: 0, user: '' };
  }
};

export const mapLikeability = (value = -1, zeroAsPass = false): string => {
  switch (value) {
    case 2:
      return 'superlike|superstar';
    case 1:
      return 'like';
    case 0:
      return zeroAsPass ? 'pass' : 'ignore';
    case -1:
    case -2:
    case -3:
    case -4:
    case -5:
      return 'pass';
    default:
      return '';
  }
};

const filterLike = (row = null, userID = '') => {
  const keys = row instanceof Object ? Object.keys(row) : [];
  const user = keys.includes('user') ? row.user : '';
  return user.toString() === userID;
};

export const mapLikeabilityRelation = (item = null): FlagVal => {
  if (item instanceof Object) {
    const { value, modifiedAt } = item;
    const keyVal = mapLikeability(value)
      .split('|')
      .shift();
    return { value: keyVal, modifiedAt };
  } else {
    return { value: '' };
  }
};

export const mapLikeabilityRelations = (
  rows: any[] = [],
  userID = '',
  viewFlags: FlagVal[] = [],
) => {
  const items = rows
    .filter(row => filterLike(row, userID))
    .map(row => mapLikeabilityRelation(row));
  const hasResult = items.length > 0;
  const result = hasResult ? items[0] : { value: '' };
  const viewed = hasResult && viewFlags.length > 0 ? viewFlags[0].value : 0;
  return hasResult && viewed > 0 ? { ...result, viewed } : result;
};

export const mapReciprocalLikeability = (
  flags: UserFlagSet,
  refUserId = '',
) => {
  const viewed = flags.from.filter(
    flag => flag.key === 'viewed' && flag.user.toString() === refUserId,
  );
  const filteredLikes = {
    from: mapLikeabilityRelations(flags.likeability.from, refUserId),
    to: mapLikeabilityRelations(flags.likeability.to, refUserId, viewed),
  };
  return filteredLikes;
};

const castValueToString = (val: any, type: string): string => {
  switch (type) {
    case 'boolean':
    case 'bool':
      return val ? '1' : '0';
    default:
      return val !== null && val !== undefined ? val.toString() : '';
  }
};

export const pushMessage = async (
  token: string,
  title = '',
  body = '',
  payload = null,
  toEmail = ''
) => {
  const result: any = { valid: false, error: null, data: null };
  try {
    const hasPayload =
      payload instanceof Object && Object.keys(payload).includes('value');
    const value = hasPayload ? JSON.stringify(payload.value) : '';
    const data = payload instanceof Object ? { ...payload, value } : {};

    await admin
      .messaging()
      .sendToDevice(token, {
        notification: {
          title,
          body,
        },
        data,
      })
      .then(response => {
        result.data = response;
        const { results, successCount } = result.data;
        result.valid =
          results instanceof Array &&
          results.length > 0 &&
          isNumeric(successCount) &&
          successCount > 0;
      })
      .catch(e => {
        result.error = e;
      });
  } catch (e) {
    result.error = e;
  }
  if (!result.valid) {
    const email = notEmptyString(toEmail) ? toEmail : 'N/A';
    if (result.data instanceof Object && result.data.results instanceof Array) {
      const datetime = new Date().toISOString();
      let errorCaptured = false;
      result.data.results.forEach(row => {
        if (row instanceof Object) {
          const { error } = row;
          if (error instanceof Object) {
            const appendMode = error.code !== "messaging/mismatched-credential";
            const filenameBase = appendMode ? 'fcm' : 'fcm.credentials';
            updateLogFile(`${filenameBase}.error.log`, JSON.stringify({ datetime, code: error.code, email, token } ), appendMode);
            errorCaptured = true;
          } else {
            updateLogFile(`fcm.error.log`, JSON.stringify({ datetime, ...row, email, token } ), true);
          }
        }
      });
      if (!errorCaptured) {
        updateLogFile('fcm.error.log', JSON.stringify({ datetime, code: "unknown", email, token } ));
      }
    }    
  }
  return result;
};

export const sendNotificationMessage = async (
  targetDeviceToken: string,
  createFlagDTO: CreateFlagDTO,
  customTitle = '',
  customBody = '',
  notificationKey = '',
  nickName = '',
  profileImg = '',
  toEmail = ''
): Promise<any> => {
  let result: any = { valid: false };
  const { key, type, value, user, targetUser } = createFlagDTO;
  if (notEmptyString(targetDeviceToken, 5)) {
    const plainText = type === 'text' && notEmptyString(value);
    const titleText =
      type === 'title_text' &&
      value instanceof Object &&
      Object.keys(value).includes('title');
    const hasCustomTitle = notEmptyString(customTitle, 3);
    if (plainText || titleText || customTitle) {
      const hasCustomBody = notEmptyString(customBody, 3);
      const title = hasCustomTitle
        ? customTitle
        : plainText
        ? key.replace(/_/g, ' ')
        : value.title;
      const body = hasCustomBody
        ? customBody
        : plainText
        ? notEmptyString(value, 2)
          ? value
          : 'Someone has interacted with you.'
        : value.text;
      const payload: any = {
        key,
        type,
        value,
        user,
        targetUser,
      };
      if (notEmptyString(notificationKey)) {
        payload.notificationKey = notificationKey;
      }
      if (notEmptyString(nickName)) {
        payload.nickName = nickName;
      }
      if (notEmptyString(profileImg, 5)) {
        payload.profileImg = profileImg;
      }
      result = await pushMessage(targetDeviceToken, title, body, payload, toEmail);
    }
  }
  return result;
};

export const pushFlag = async (token: string, flag: IFlag) => {
  const entries = flag instanceof Object ? Object.entries(flag) : [];
  const hasType = entries.some(entry => entry[0] === 'type');
  const type = hasType ? flag.type : '';
  const strEntries: string[][] = hasType
    ? entries.map(entry => {
        const [key, val] = entry;
        const value =
          typeof val === 'string' ? val : castValueToString(val, type);
        return [key, value];
      })
    : [];
  const data = Object.fromEntries(strEntries);
  return await pushMessage(token, data.key, JSON.stringify(data));
};

export const mapFlagItems = (flagKey = ''): FlagItem => {
  const defVal = { key: flagKey, value: true, op: 'eq' };
  switch (flagKey) {
    case 'like':
      return { ...defVal, value: 1 };
    case 'superlike':
      return { ...defVal, value: 2 };
    case 'ignore':
    case 'not_interested':
      return { ...defVal, value: 0 };
    case 'pass':
    case 'passed':
      return { ...defVal, value: 0, op: 'lt' };
    case 'passed3':
      return { ...defVal, value: -2, op: 'lt' };
    default:
      return defVal;
  }
};

export const subFilterFlagItems = (
  flag: IFlag,
  fi: FlagItem,
  excludeAllStartTs = -1,
) => {
  let excludeIfRecent = false;
  if (excludeAllStartTs > 100000) {
    const refTs = new Date(flag.modifiedAt).getTime();

    excludeIfRecent = refTs >= excludeAllStartTs;
  }
  return (
    flag.key === 'likeability' &&
    (excludeIfRecent ||
      (fi.op === 'eq' && fi.value === flag.value) ||
      (fi.op === 'lt' && flag.value < fi.value))
  );
};

export const filterLikeabilityFlags = (
  flag: IFlag,
  flagItems: FlagItem[],
  excludeAllStartTs = -1,
) => flagItems.some(fi => subFilterFlagItems(flag, fi, excludeAllStartTs));

export const filterLikeabilityContext = (context = '') => {
  switch (context) {
    case 'liked':
      return { liked1: 1, unrated: 1 };
    case 'superliked':
    case 'starred':
    case 'superstarred':
      return { liked2: 1, unrated: 1 };
    case 'matched':
    case 'match':
      return { liked: 1, mutual: 1 };
    default:
      return {};
  }
};

export const defaultPushNotifications = [
  'astro_insights',
  'been_matched',
  'been_liked',
  'been_superliked',
  'message_received',
];

export const extractPushNotifications = (prefs: any[] = []) => {
  const pnData = extractKeyedItemValue(prefs, 'push_notifications', 'array');
  return pnData.matched ? pnData.item : defaultPushNotifications;
};

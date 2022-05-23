import * as Redis from 'ioredis';

export const updateSubEntity = (source, data: any) => {
  if (data instanceof Object && source instanceof Object) {
    const entries = Object.entries(data);
    entries.forEach(([k, v]) => {
      source[k] = v;
    });
  }
  return source;
};

export const updateInSubEntities = (items: any[], refID: string, data: any) => {
  items.forEach((item, index) => {
    if (item._id.toString() === refID) {
      items[index] = updateSubEntity(item, data);
    }
  });
  return items;
};

export const isObjectWith = (obj = null, fields = []) => {
  const isObject = obj instanceof Object;
  const keys = isObject ? Object.keys(obj) : [];
  const hasFields = fields instanceof Array ? fields.length > 0 : false;
  const keysMatched = hasFields
    ? fields.some(f => keys.includes(f) === false) === false
    : true;
  return isObject && keysMatched;
};

export const hashMapToObject = (
  hm: Map<string, any>,
  sortKeys: string[] = [],
) => {
  if (sortKeys.length > 0) {
    const hm2 = new Map<string, any>();
    sortKeys.forEach(k => {
      if (hm.has(k)) {
        hm2.set(k, hm.get(k));
      }
    });
    hm = hm2;
  }
  return Object.fromEntries(hm);
};

export const extractObjValue = (obj: any, key: string) => {
  let matchedVal = null;
  if (obj) {
    const keyVals = Object.entries(obj)
      .filter(item => item[0] === key)
      .map(item => item[1]);
    if (keyVals.length > 0) {
      matchedVal = keyVals[0];
    }
  }
  return matchedVal;
};

export const extractObject = (obj: any) => {
  let matchedVal = null;
  if (obj) {
    const keyVals = Object.entries(obj)
      .filter(item => item[0] === '_doc')
      .map(item => item[1]);
    if (keyVals.length > 0) {
      matchedVal = keyVals[0];
    } else if (obj instanceof Object) {
      matchedVal = obj;
    }
  }
  return matchedVal;
};

export const removeObjectId = (item = null) => {
  const obj = item instanceof Object ? extractObject(item) : item;
  if (obj instanceof Object) {
    if (obj instanceof Array) {
      return obj.map(removeObjectId);
    } else {
      const keys = Object.keys(obj);
      if (keys.includes('_id')) {
        delete obj._id;
      }
      keys.forEach(k => {
        if (obj[k] instanceof Object) {
          obj[k] = removeObjectId(obj[k]);
        }
      });
    }
  }
  return obj;
};

export const extractObjectAndMergeRaw = (
  obj: any,
  data: Map<string, any>,
  exclude: string[],
  removeInnerIds = false,
) => {
  const matchedObj = extractObject(obj);
  if (matchedObj) {
    Object.entries(matchedObj).forEach(entry => {
      if (exclude.indexOf(entry[0]) < 0 && entry[0] !== '__v') {
        const val =
          removeInnerIds && entry[1] instanceof Object
            ? removeObjectId(entry[1])
            : entry[1];
        data.set(entry[0], val);
      }
    });
  }
  return { dataMap: data, matchedObj };
};

export const extractObjectAndMerge = (
  obj: any,
  data: Map<string, any>,
  exclude: string[],
  removeInnerIds = false,
) => {
  const { dataMap } = extractObjectAndMergeRaw(obj, data, exclude, removeInnerIds);
  return dataMap;
};

export const extractSimplified = (obj: any, exclude: string[]) => {
  const matchedVal = extractObject(obj);
  const data = new Map<string, any>();
  return hashMapToObject(extractObjectAndMerge(matchedVal, data, exclude));
};

export const extractByKeys = (obj: any, keys: string[]): any => {
  const mp = new Map<string, any>();
  if (obj instanceof Object) {
    keys.forEach(k => {
      mp.set(k, obj[k]);
    });
  }
  return Object.fromEntries(mp);
};

export const extractDocId = (matchedModel): string => {
  let idStr = '';
  if (matchedModel) {
    const matchedDoc = extractObjValue(matchedModel, '_doc');
    if (matchedDoc) {
      idStr = extractObjValue(matchedDoc, '_id');
    } else {
      idStr = extractObjValue(matchedModel, '_id');
    }
  }
  if (idStr) {
    idStr = idStr.toString();
  }
  return idStr;
};

export const extractPairArrayFromObject = (obj: any, keys: string[]) => {
  const vals = [];
  if (obj instanceof Object) {
    Object.entries(extractObject(obj)).forEach(entry => {
      const [key, val] = entry;
      if (keys.indexOf(key) >= 0) {
        vals.push([key, val]);
      }
    });
  }
  return vals;
};

export const objectToMap = (obj: any = null) => {
  const entries = obj instanceof Object ? Object.entries(obj) : [];
  const queryMap: Map<string, any> = new Map(entries);
  return queryMap;
};

export const extractArrayFromObject = (obj: any, keys: string[]) => {
  return extractPairArrayFromObject(obj, keys).map(pair => pair[1]);
};

export const simplifyObject = (obj: any, keys: string[]) => {
  const pairs = extractArrayFromObject(obj, keys).map(pair => pair[1]);
  const hm = new Map<string, any>();
  pairs.forEach(pair => {
    hm.set(pair[0], pair[1]);
  });
  return hashMapToObject(hm);
};

export const extractFromRedisMap = redisMap => {
  let redis = null;
  if (redisMap instanceof Object) {
    for (const item of redisMap) {
      if (item instanceof Array && item.length > 1) {
        redis = item[1];
      }
      break;
    }
  }
  return redis;
};

export const extractFromRedisClient = async (
  client: Redis.Redis,
  key: string,
) => {
  let result = null;
  if (client instanceof Object) {
    const strVal = await client.get(key);
    if (strVal) {
      if (typeof strVal === 'string' && strVal !== '[object Object]') {
        try { 
          result = JSON.parse(strVal);
        } catch (e) {
          result = {};
        }
      } else {
        result = strVal;
      }
    }
  }
  return result;
};

export const storeInRedis = async (client: Redis.Redis, key: string, value, expire = -1) => {
  let result = false;
  if (client instanceof Object) {
    const secs = expire > 5 ? expire :  60 * 60 * 24 * 365;
    client.set(key, JSON.stringify(value), 'EX', secs);
    result = true;
  }
  return result;
};

export const listRedisKeys = async (client: Redis.Redis, key = '', max = -1) => {
  let keys: string[] = [];
  if (client instanceof Object) {
    const matchedKeys = await client.keys(key + '*');
    if (matchedKeys instanceof Array) {
      const size = matchedKeys.length;
      const filterMax = max > 5;
      keys = filterMax && size > max ? matchedKeys.slice(0, max) : matchedKeys;
    }
  }
  return keys;
};


export const clearRedisByKey = async (client: Redis.Redis, key = '') => {
  let result = false;
  if (client instanceof Object) {
    if (key.includes('*') && key.length > 5) {
      const keys = await listRedisKeys(client, key);
      if (keys.length > 0) {
        for (const delKey of keys) {
          client.del(delKey);
        }
        result = true;
      }
    } else {
      client.del(key);
      result = true;
    }
    
  }
  return result;
};
export const listEmptyRedisKeys = async (client: Redis.Redis, deleteAll = false) => {
  const keys: string[] = [];
  if (client instanceof Object) {
    const matchedKeys = await client.keys('*');
    if (matchedKeys instanceof Array) {
      for (const key of matchedKeys) {
        const kVal = await extractFromRedisClient(client, key);
        if (kVal === null || kVal === undefined) {
          keys.push(key);
          if (deleteAll) {
            clearRedisByKey(client, key);
          }
        }
      }
    }
  }
  return keys;
};
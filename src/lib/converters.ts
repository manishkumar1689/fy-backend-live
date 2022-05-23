import { convert } from 'html-to-text';
import { Snippet } from '../snippet/interfaces/snippet.interface';
import { KeyNumValue } from './interfaces';
import { isNumeric, notEmptyString } from './validators';

export const objectToQueryString = (obj: any): string => {
  let str = '';
  if (obj instanceof Object) {
    const items = Object.entries(obj).map(entry => {
      const [k, v] = entry;
      let value = '';
      switch (typeof v) {
        case 'string':
          value = v;
          break;
        case 'number':
        case 'boolean':
          value = v.toString();
          break;
      }
      return [k, encodeURIComponent(value)].join('=');
    });
    if (items.length > 0) {
      str = '?' + items.join('&');
    }
  }
  return str;
};

export const mapToQueryString = (map: Map<string, any>): string => {
  return objectToQueryString(Object.fromEntries(map));
};

export const smartCastString = (item = null, defVal = ''): string => {
  let out = defVal;
  switch (typeof item) {
    case 'string':
      out = item;
      break;
    case 'number':
    case 'boolean':
      out = item.toString();
      break;
  }
  return out;
};

export const smartCastNumber = (
  item: any,
  defVal = 0,
  isInt = false,
): number => {
  let out = defVal;
  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*-?\d+(\.\d+)?\s*/.test(item)) {
        out = isInt ? parseInt(item, 10) : parseFloat(item);
      }
    }
  } else if (typeof item === 'number') {
    out = item;
  }
  return out;
};

export const smartCastInt = (item: any, defVal = 0): number => {
  return smartCastNumber(item, defVal, true);
};

export const smartCastFloat = (item: any, defVal = 0): number => {
  return smartCastNumber(item, defVal, false);
};

export const smartCastBool = (item: any, defVal = false): boolean => {
  let intVal = defVal ? 1 : 0;
  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*\d+(\.\d+)?\s*/.test(item)) {
        intVal = parseInt(item, 10);
      }
    }
  } else if (typeof item === 'number') {
    intVal = item;
  } else if (typeof item === 'boolean') {
    intVal = item ? 1 : 0;
  }
  return intVal > 0;
};

export const dateTimeSuffix = () =>
  new Date()
    .toISOString()
    .split('.')
    .shift()
    .replace(/[:-]/g, '');

export const sanitize = (str: string, separator = '-') => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(/([a-z0-9])[^a-z0-9]+$/, '$1');
};

export const zeroPad = (inval: number | string, places = 2) => {
  let num = 0;
  if (typeof inval === 'string') {
    num = parseInt(inval);
  } else if (typeof inval === 'number') {
    num = inval;
  }
  const strs: Array<string> = [];
  const len = num > 0 ? Math.floor(Math.log10(num)) + 1 : 1;
  if (num < Math.pow(10, places - 1)) {
    const ep = places - len;
    strs.push('0'.repeat(ep));
  }
  strs.push(num.toString());
  return strs.join('');
};

export const roundNumber = (num: number, places = 6) => {
  if (typeof num === 'number') {
    const multiplier = Math.pow(10, places);
    const bigNum =
      places > 7 ? Math.floor(multiplier * num) : Math.round(multiplier * num);
    return bigNum / multiplier;
  } else {
    return 0;
  }
};

export const toStartRef = (startRef = null) => {
  const monthRef = /^\d+m$/i;
  return isNumeric(startRef)
    ? parseFloat(startRef)
    : monthRef.test(startRef)
    ? parseInt(startRef.replace(/[^0-9]\./, ''), 10) / 12
    : startRef;
};

export const keyValuesToSimpleObject = (
  rows: any[] = [],
  valueField = 'value',
) => {
  const rowEntries = rows
    .filter(row => row instanceof Object)
    .map(row => Object.entries(row))
    .filter(
      entries =>
        entries.some(entry => entry[0] === 'key') &&
        entries.some(entry => entry[0] === valueField),
    )
    .map(entries => {
      const k = entries.find(entry => entry[0] === 'key');
      const v = entries.find(entry => entry[0] === valueField);
      return k instanceof Array && v instanceof Array
        ? [k[1], v[1]]
        : ['', null];
    });
  return Object.fromEntries(rowEntries);
};

export const simpleObjectToKeyValues = (inData: any = null): KeyNumValue[] => {
  if (inData instanceof Object) {
    return Object.entries(inData)
      .filter(entry => isNumeric(entry[1]))
      .map(([key, value]) => {
        return {
          key,
          value: smartCastFloat(value),
        };
      });
  } else {
    return [];
  }
};

export function shuffle<T>(unshuffled: T[]): T[] {
  return unshuffled
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export interface MatchedItem {
  item: any;
  matched: boolean;
}

export const extractKeyedItem = (items: any[] = [], key = ''): MatchedItem => {
  const matchedItem = items.find(item => item.key === key);
  return { item: matchedItem, matched: matchedItem instanceof Object };
};

export const extractKeyedItemValue = (
  items: any[] = [],
  key = '',
  type = 'any',
): MatchedItem => {
  const matchedItem = items.find(item => item.key === key);
  let matched = matchedItem instanceof Object;
  const value = matched ? matchedItem.value : null;
  if (matched) {
    switch (type) {
      case 'string':
        matched = typeof value === 'string';
        break;
      case 'number':
        matched = typeof value === 'number';
        break;
      case 'bool':
      case 'boolean':
        matched = typeof value === 'boolean';
        break;
      case 'array':
        matched = value instanceof Array;
        break;
      case 'object':
        matched = value instanceof Object && !(value instanceof Array);
        break;
    }
  }
  return { item: value, matched };
};

export const extractBooleanFromKeyedItems = (
  items: any[] = [],
  key = '',
  defaultValue = false,
): boolean => {
  const { matched, item } = extractKeyedItem(items, key);
  return matched && typeof item.value === 'boolean' ? item.value : defaultValue;
};

export const extractStringFromKeyedItems = (
  items: any[] = [],
  key = '',
  defaultValue = '',
): string => {
  const { matched, item } = extractKeyedItem(items, key);
  return matched && typeof item.value === 'string' ? item.value : defaultValue;
};

export const extractFloatFromKeyedItems = (
  items: any[] = [],
  key = '',
  defaultValue = 0,
): string => {
  const { matched, item } = extractKeyedItem(items, key);
  return matched && typeof item.value === 'number' ? item.value : defaultValue;
};

export const extractArrayFromKeyedItems = (
  items: any[] = [],
  key = '',
  defaultValue = [],
  minLen = 2,
): any[] => {
  const { matched, item } = extractKeyedItem(items, key);
  return matched && item.value instanceof Array && item.value.length >= minLen
    ? item.value
    : defaultValue;
};

export const htmlToPlainText = (html = ''): string => {
  if (notEmptyString(html)) {
    return convert(html, { wordwrap: 130 });
  } else {
    return '';
  }
};


export const extractSnippetTextByLang = (storedSnippet: Snippet, lang = 'en') => {
  let text = '';
    if (storedSnippet.values instanceof Array) {
      const langRoot = lang.split('-').shift();
      let langIndex = storedSnippet.values.findIndex(tr => tr.lang === lang);
      if (langIndex < 0 && langRoot !== lang) {
        langIndex = storedSnippet.values.findIndex(tr => tr.lang === langRoot);
      }
      if (langIndex < 0 && langRoot !== 'en') {
        langIndex = storedSnippet.values.findIndex(tr => tr.lang === 'en');
      }
      if (langIndex >= 0) {
        const version = storedSnippet.values[langIndex];
        if (version instanceof Object) {
          text = version.text;
        }
      }
    }
    return text;
}
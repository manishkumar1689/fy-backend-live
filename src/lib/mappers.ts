import { Snippet } from '../snippet/interfaces/snippet.interface';
import { notEmptyString } from './validators';

export interface LangText {
  text: string;
  lang: string;
  [key: string]: any;
}

export const filterByLang = (values: LangText[], lang = 'en') => {
  const langRoot = lang.split('-').shift();
  const hasLocale = langRoot !== lang && langRoot.length > 1;
  let value = '';
  if (values instanceof Array) {
    let index = values.findIndex(v => v.lang === lang);
    if (index < 0 && hasLocale) {
      index = values.findIndex(v => v.lang.startsWith(langRoot));
    }
    if (index >= 0) {
      value = values[index].text;
    } else if (values.length > 0) {
      value = values[0].text;
    }
  }
  return value;
};

export const extractSnippet = (
  items: Snippet[] = [],
  keyEnd = '',
  lang = 'en',
) => {
  const snippet = items.find(sn => sn.key.endsWith(keyEnd));
  let text = '';
  if (snippet instanceof Object && snippet.values instanceof Array) {
    text = filterByLang(snippet.values, lang);
  }
  return text;
};

export const filterCorePreference = (pr: any) =>
  pr instanceof Object &&
  ['faceted', 'jungian', 'simple_astro_pair'].includes(pr.type) === false;

export const matchFromPreferenceByKey = (
  preferences: any[] = [],
  targetKey = 'lang',
  defVal: any = null,
): any => {
  const pref = preferences.find(
    pr =>
      pr instanceof Object &&
      Object.keys(pr).includes('key') &&
      pr.key === targetKey,
  );
  return pref instanceof Object && Object.keys(pref).includes('value')
    ? pref.value
    : defVal;
};

export const matchValidLang = (lang: string, defVal = 'en'): string => {
  return notEmptyString(lang, 1) && /[a-z][a-z][a-z]?(-[A-Z][A-Z])/.test(lang)
    ? lang
    : defVal;
};

export const matchLangFromPreferences = (
  preferences: any[] = [],
  defVal = 'en',
): string => {
  const lang = matchFromPreferenceByKey(preferences, 'lang', defVal);
  return matchValidLang(lang, defVal);
};

export const removeIds = (item: any = null) => {
  if (item instanceof Object) {
    delete item._id;
  }
  return item;
};

export const assignGenderOpt = (genderVal: any = null): string[] => {
  if (typeof genderVal === 'string') {
    const strVal = genderVal.trim();
    if (strVal.length > 0) {
      const firstLetter = strVal.substring(0, 1).toLowerCase();
      switch (firstLetter) {
        case 'm':
          return ['m'];
        case 'f':
        case 'w':
          return ['f'];
        case 'b':
          return ['f', 'm'];
      }
    }
  } else if (genderVal instanceof Array) {
    return genderVal
      .filter(op => typeof op === 'string')
      .map(op => op.toLowerCase());
  }
  return [];
};

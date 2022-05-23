import { Snippet } from '../../snippet/interfaces/snippet.interface';

export const mapSimplePreferenceOption = (item = null) => {
  const itemObj =
    item instanceof Object ? item : { key: '', type: '', value: null };
  const { key, type } = itemObj;
  let value: any = 'plain text';
  switch (type) {
    case 'range_number':
      value = [18, 30];
      break;
    case 'uri':
      value = 'https://resource.com/03736335/video/393737';
      break;
    case 'string':
      value = 'word_of_mouth';
      break;
    case 'array_string':
      value = ['no_beef', 'no_pork'];
      break;
    case 'integer':
      value = 15;
      break;
    case 'float':
      value = 2.5;
      break;
    case 'key_scale':
      value = { never: 0 };
      break;
    case 'scale':
      value = 2;
      break;
    case 'array_key_scale':
      value = { cricket: 5, football: 3, tennis: 1 };
      break;
    case 'boolean':
      value = true;
      break;
    case 'multiple_key_scales':
      value = {
        key: 'optimistic',
        values: {
          happiness: 4,
          success: 2,
          reliability: 1,
          aspiration: 2,
        },
      };
      break;
    case 'array_float':
      value = [2.8, 11.9];
      break;
    case 'array_integer':
      value = [30, 40, 12];
      break;
    case 'text':
      value = 'Cambridge University';
      break;
  }
  return { key, type, value };
};

const clearnSnippetValue = (value = null) => {
  const { text, lang } = value;
  return { lang, text };
};

export const cleanSnippet = (snippet: Snippet) => {
  const snipObj = snippet.toObject();
  const { key, values } = snipObj;
  return {
    key,
    values: values.filter(val => val instanceof Object).map(clearnSnippetValue),
  };
};

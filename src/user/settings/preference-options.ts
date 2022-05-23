import multipleKeyScales from './multiscales';

const preferenceOptions = [
  {
    key: 'age_range',
    prompt: 'Which age range appeals to you?', // user may specify
    type: 'range_number',
    rules: [
      {
        key: 'min',
        value: 18,
      },
    ],
  },
  {
    key: 'gender',
    prompt: 'To which genders are you attracted?',
    type: 'array_string',
    options: ['f', 'm', 'tf', 'tm', 'nb'],
    rules: [
      {
        key: 'custom',
        value: true,
      },
    ],
  },
  {
    key: 'max_distance',
    prompt: 'Only show partners within this range',
    type: 'float', // probably stored in km, but users may select from arbitrary values in km or miles
  },
  {
    key: 'geo_limits',
    prompt: 'Any other practical geographical constraints?',
    type: 'array_string',
    options: ['same_island', 'same_region', 'same_country'],
  },
  {
    key: 'religions',
    prompt:
      "Do you have any preferences about your partner's religious persuasion?",
    type: 'array_key_scale',
    options: [
      'hindu',
      'christian',
      'buddhist',
      'jewish',
      'muslim',
      'sikh',
      'shinto',
      'atheist',
    ],
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
      {
        key: 'custom',
        value: true,
      },
    ],
  },
  {
    key: 'member_smoker_status',
    prompt: 'Do you smoke at all?',
    type: 'key_scale',
    options: [
      { key: 'never', value: 0 },
      { key: 'occasionally', value: 1 },
      { key: 'moderately', value: 2 },
      { key: 'passionately', value: 3 },
    ],
  },
  {
    key: 'partner_smoker',
    prompt: 'Do you mind if your partner smokes?',
    type: 'scale',
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
    ],
  },
  {
    key: 'member_diet',
    prompt: 'What are your dietary preferences?',
    type: 'array_string',
    options: [
      'vegetarian',
      'vegan',
      'pescatarian',
      'no_beef',
      'no_pork',
      'no_crustaceans',
      'no_junk',
    ],
  },
  {
    key: 'partner_vegetarian',
    prompt: 'Would you like a vegetarian partner?',
    type: 'scale',
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
    ],
  },
  {
    key: 'partner_vegan',
    prompt: 'Would you like a vegan partner?',
    type: 'scale',
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
    ],
  },
];

const qs1 = [
  'I make friends easily',
  'I have a vivid imagination',
  'I trust others',
  'I complete tasks successfully',
  'I get angry easily',
  'I really enjoy large parties and gatherings',
  'I think art is important',
  'I use and manipulate others to get my own way',
  "I don't like things to be a mess - I like to tidy up",
  'I often feel sad',
  'I like to take charge of situations and events',
  'I experience deep and varied emotions',
  'I love to help others',
  'I keep my promises',
  'I find it difficult to approach others',
  'I am always busy - always on the go',
  'I prefer variety to routine',
  'I love a good argument - a good fight',
];

const qs2 = [
  'I work hard',
  "I over-indulge and go on 'binges'",
  'I love excitement',
  'I enjoy reading challenging books and articles',
  'I believe that I am better than others',
  'I am always prepared',
  'I panic easily',
  'I am a really cheerful person',
  'I tend to support political candidates who favour progress and reform',
  'I sympathise with the homeless',
  'I am very spontaneous - I act without thinking',
  "I 'fear for the worst'",
  'I feel comfortable around people',
  "I enjoy 'wild flights of fantasy'",
  'I believe that people basically have good intentions',
  'When I do something, I always do it well',
  'I get irritated easily',
  'I always chat to lots of different people at parties',
  'I see beauty in things that others might not notice',
  "I don't mind cheating to get ahead",
  'I often forget to put things back in their proper place',
  'I dislike myself',
  'I try to be in charge - to lead others',
  "I am empathetic - I feel others' emotions",
  'I am concerned about others',
  'I tell the truth',
  'I am afraid to draw attention to myself',
  "I never sit still - I'm always on the go",
  'I prefer to stick with things that I know',
  'I shout and yell at people',
  "I do more than what's expected of me",
  'I rarely over-indulge',
  'I go out of my way to seek adventure',
];

const qs3 = [
  'I avoid philosophical discussions',
  'I think highly of myself',
  'I get the job done and carry out my plans',
  'I become overwhelmed by events',
  'I have a lot of fun',
  'I believe that there is no absolute right or wrong',
];

const qs4 = [
  'I break rules',
  'I only really feel comfortable with friends',
  'I do a lot in my spare time',
  'I dislike changes',
  'I insult people',
  'I do just enough work to get by',
  'I easily resist temptations',
];

const qs5 = [
  'I tend to support political candidates who favour conventional and traditional views',
  "I am not interested in other people's problems",
  'I rush into things',
  'I get stressed out easily',
  'I keep others at a distance',
  'I like to get lost in thought',
  'I distrust people',
  'I know how to get things done',
  'I am not easily annoyed',
  'I avoid crowds',
  'I do not enjoy going to art galleries or exhibitions',
];

const qs6 = [
  "I am un-cooperative - I obstruct other peoples' plans",
  "I leave my 'bits and pieces' and belongings around",
  'I feel comfortable with myself',
  'I wait for others to take the lead',
  "I don't understand people who get emotional",
  "I don't have time for other people",
  'I break my promises',
];

const qs7 = [
  'I am not bothered by difficult social situations',
  'I like to take it easy',
  'I am attached to conventional ways',
  'I always even the score with others',
  'I put little time and effort into my work',
  'I am able to control my cravings',
  'I act zany and outrageously',
  'I am not interested in theoretical discussions',
];

const qs8 = [
  'I boast about my virtues',
  'I have difficulty starting tasks',
  'I remain calm under pressure',
  'I look at the bright side of life',
  'I believe that we should be very tough on crime',
  'I try not to think about the needy',
  'I act without thinking',
];

const qs9 = [
  'I feel sympathy for those who are worse off than myself',
  'I make rash decisions',
  'I am afraid of many things',
  'I avoid coming into contact with people if I can help it',
  'I love to daydream',
  'I trust what people say',
  'I handle tasks methodically',
  'I frequently lose my temper',
];

const qs10 = [
  'I prefer to be alone',
  'I do not like poetry',
  'I take advantage of others',
  'I always leave the place in a mess',
  'I am often down in the dumps',
  'I take control of situations',
  'I rarely notice my emotional reactions and feelings',
  'I am indifferent to the feelings of others',
];

const qs11 = [
  'I enjoy being reckless',
  'I have difficulty understanding abstract ideas',
  'I have a high opinion of myself',
  'I waste my time',
  "I feel that I'm unable to deal with things",
  'I love life',
];

const subOpts = [
  {
    name: '1',
    value: 1,
  },
  {
    name: '2',
    value: 2,
  },
  {
    name: '3',
    value: 3,
  },
  {
    name: '4',
    value: 4,
  },
  {
    name: '5',
    value: 5,
  },
];

const valueOpts = [
  {
    key: 'big5_openness',
    category: 'big5',
    name: 'openness',
    value: 3,
    options: subOpts,
  },
  {
    key: 'big5_conscientiousness',
    category: 'big5',
    name: 'conscientiousness',
    value: 3,
    options: subOpts,
  },
  {
    key: 'big5_extraversion',
    category: 'big5',
    name: 'extraversion',
    value: 3,
    options: subOpts,
  },
  {
    key: 'big5_agreeableness',
    category: 'big5',
    name: 'agreeableness',
    value: 3,
    options: subOpts,
  },
  {
    key: 'big5_neuroticism',
    category: 'big5',
    name: 'neuroticism',
    value: 3,
    options: subOpts,
  },
];

const buildSubOpts = (range: Array<number>) => {
  const [min, max] = range;
  const subOpts = [];
  for (let n = min; n <= max; n++) {
    subOpts.push({
      value: n,
      name: n.toString(),
    });
  }
};

export const translateItemKey = (key: string) => {
  const refKey = key.toLowerCase().replace(/[-_]+/g, '');
  switch (refKey) {
    case 'minus2':
      return 'Very Inaccurate';
    case 'minus1':
      return 'Moderately Inaccurate';
    case 'neutral':
      return 'Neither Inaccurate nor Accurate';
    case 'plus1':
      return 'Moderately Accurate';
    case 'plus2':
      return 'Very Accurate';
    default:
      return key
        .replace(/^(\w+)_(\w+)$/, '$1 - $2')
        .replace(/(\w+)[_-]+(\w)/g, '$1 $2');
  }
};

const matchValueOpts = (category: string) => {
  const optSet = multipleKeyScales.find(ms => ms.key === category);
  let vo = [];
  if (optSet) {
    const { items, range } = optSet;
    if (items instanceof Array) {
      vo = items.map(itemKey => {
        return {
          key: [category, itemKey].join('_'),
          category,
          name: translateItemKey(itemKey),
          value: 3,
          options: buildSubOpts(range),
        };
      });
    }
  }
  return vo;
};

const buildOptions = (category: string) => {
  const keys = ['minus1', 'minus2', 'neutral', 'plus1', 'plus2'];
  return keys.map(key => {
    const valueOpts = matchValueOpts(category);
    return {
      key,
      name: translateItemKey(key),
      valueOpts,
    };
  });
};

export const buildSurveyOptions = (category = '') => buildOptions(category);

const matchPersonalityOptions = (subkey = 'personality') => {
  let questions = [];
  switch (subkey) {
    case 'personality':
      questions = qs1;
      break;
    case 'jungian':
      questions = qs2;
      break;
    case 'ayurvedic':
      questions = qs3;
      break;
    case 'quirks':
      questions = qs4;
      break;
    case 'spirituality':
      questions = qs5;
      break;
    case 'politics':
      questions = qs6;
      break;
    case 'topics':
      questions = qs7;
      break;
    case 'hobbies':
      questions = qs8;
      break;
    case 'diet':
      questions = qs9;
      break;
    case 'smoking':
      questions = qs10;
      break;
    case 'feedback':
      questions = qs11;
      break;
  }
  return questions.map(prompt => {
    const key = prompt
      .toLowerCase()
      .trim()
      .replace(/[^A-Za-z0-9]+/gi, '_')
      .replace(/(^|_)(the|i|a|an|of|in|on)_/gi, '_')
      .replace(/^_+|_+$/, '');
    let multiscales = '';
    let range = [0, 0];
    switch (subkey) {
      case 'personality':
        multiscales = 'big5';
        range = [1, 5];
        break;
      case 'jungian':
        multiscales = 'jungian';
        range = [1, 8];
        break;
    }
    return {
      key,
      prompt: prompt,
      type: 'multiple_key_scale',
      range,
      multiscales,
      options: buildOptions(multiscales),
      rules: [],
    };
  });
};

const getDefaultPreferences = (key = 'preference_options') => {
  const subkey = key.split('_option').shift();
  switch (subkey) {
    case 'preference':
      return preferenceOptions;
    default:
      return matchPersonalityOptions(subkey);
  }
};

export interface PrefKeyValue {
  key: string;
  value: any;
}

export interface MatchedOption {
  key: string;
  prompt?: string;
  type?: string;
  rules: PrefKeyValue[];
  options?: any[];
  value: any;
}

export default getDefaultPreferences;

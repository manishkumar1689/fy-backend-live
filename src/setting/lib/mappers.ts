import { Model } from 'mongoose';
import { smartCastInt } from '../../lib/converters';
import { PreferenceOption } from '../../user/interfaces/preference-option.interface';
import { Preference } from '../../user/interfaces/preference.interface';
import { isNumeric, notEmptyString } from '../../lib/validators';
import {
  Big5ScaleMap,
  FacetedSet,
  JungianScaleMap,
  ScalePreferenceAnswer,
  SimpleResult,
} from './interfaces';
import { FacetedItemDTO } from '../dto/faceted-item.dto';
import { Snippet } from '../../snippet/interfaces/snippet.interface';
import {
  facetedBig5Categories,
  facetedJungianCategories,
  facetedJungianFormulae,
} from '../settings/faceted-big5';
import { KeyNumValue } from '../../lib/interfaces';

/*
  Adding/subtracting this number converts from a -2 to 2 range to 1 to 5
  for compatibility with Big 5 analysis
*/
export const defaultFacetedScaleRange = 5;

export const big5FacetedScaleOffset = Math.ceil(defaultFacetedScaleRange / 2);

const transformMultipleKeyScaleQuestions = (
  question,
  value,
  multiscaleData,
) => {
  const optData = question.options.find(opt => opt.key === value);
  let score = null;
  if (optData instanceof Object) {
    if (optData.valueOpts instanceof Array) {
      const category = optData.valueOpts[0].category;
      const row = multiscaleData.find(item => item.key === category);
      const values = optData.valueOpts.map(op => {
        const keyEnd = op.key
          .split('_')
          .splice(1)
          .join('_');
        return [keyEnd, op.value];
      });
      const num = values.length;
      const total = values.map(entry => entry[1]).reduce((a, b) => a + b, 0);
      const max = row.range[1] * num;
      const min = row.range[0] * num;
      score = {
        scales: Object.fromEntries(values),
        max,
        min,
        total,
      };
    }
  }
  return score;
};

export const compareSurveyScores = (
  scales1: Big5ScaleMap | JungianScaleMap,
  scales2: Big5ScaleMap | JungianScaleMap,
  mode = 'big5',
) => {
  const entries = Object.entries(scales1);
  const num = entries.length;
  const max = mode === 'big5' ? 4 : 9;
  const totalDiff = entries
    .map(([k, v]) => {
      const v2 = Object.keys(scales2).includes(k) ? scales2[k] : 0;
      return Math.abs(v - v2);
    })
    .reduce((a, b) => a + b, 0);
  return ((max - totalDiff / num) / max) * 100;
};

export const compareSurveyScoreSets = (
  scaleSet1: any[],
  scaleSet2: any[],
  type = 'big5',
) => {
  const scores = scaleSet1
    .filter(
      (scales1, index) =>
        scales1 instanceof Object &&
        index < scaleSet2.length &&
        scaleSet2[index] instanceof Object,
    )
    .map((scales1, index) => {
      const scales2 = scaleSet2[index];
      return compareSurveyScores(scales1, scales2, type);
    });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
};

const applyAdjustedScore = (value = 0, offset = 0, inverted = false) => {
  let score = smartCastInt(value, 0) + offset;
  if (inverted) {
    if (offset === 0) {
      score = defaultFacetedScaleRange + 1 - score;
    }
  }
  return score;
};

export const normalizeFacetedAnswer = (
  facetedResponse: ScalePreferenceAnswer,
  sourcePrefs: PreferenceOption[],
  applyOffset = true,
): FacetedSet => {
  const { key, value } = facetedResponse;
  const sq = sourcePrefs.find(s => s.key === key);
  const offset = applyOffset ? big5FacetedScaleOffset : 0;
  if (sq instanceof Object) {
    const { domain, subdomain } = sq;
    return {
      key,
      score: applyAdjustedScore(value, offset, sq.inverted),
      domain,
      facet: smartCastInt(subdomain, 0),
    };
  } else {
    return {
      key: '',
      score: 0,
      domain: '',
      facet: 0,
    };
  }
};

export const normalizedToPreference = (
  facetedResponse: FacetedItemDTO,
  type = 'faceted',
) => {
  const { key, value } = facetedResponse;
  return {
    type,
    key,
    value: value - big5FacetedScaleOffset,
  };
};

export const normalizeFacetedPromptItem = (
  po: PreferenceOption,
  versionData = null,
  hasVersions = false,
) => {
  const { key, prompt, domain, subdomain, inverted } = po;
  return {
    key,
    prompt,
    domain,
    subdomain: smartCastInt(subdomain),
    inverted,
    versions: versionData.prompt,
    hasVersions,
  };
};

/*
  This assumes a 1 to 5 scale
*/
const calculateFacetedResult = (score: number, count: number): string => {
  const average = Math.round(score / count);
  let result = 'neutral';
  if (average > big5FacetedScaleOffset) {
    result = 'high';
  } else if (average < big5FacetedScaleOffset) {
    result = 'low';
  }
  return result;
};

const calcFacetedItemPercent = (
  score = 0,
  count = 0,
  max = -1,
  rescaleFromMiddle = true,
): number => {
  const maxTotal = max > 1 ? count * max : count * defaultFacetedScaleRange;
  const scaledScore = rescaleFromMiddle ? score - count : score;
  const scaledTotal = rescaleFromMiddle ? maxTotal - count : maxTotal;
  return Math.round(100 * 100000 * (scaledScore / scaledTotal)) / 100000;
};

export const matchFacetedFeedback = (
  feedbackItems: Snippet[],
  domain = '',
  facet = 0,
  result = 'neutral',
  rangeKey = '',
) => {
  if (
    isNumeric(facet) &&
    (domain.length >= 1 || domain.length <= 2) &&
    (['low', 'high', 'neutral'].includes(result) || result.length === 1)
  ) {
    const isJungian = domain.length === 2;
    const domLetter = isJungian ? 'sub' : domain.toLowerCase();
    const prefix = isJungian ? 'jung' : 'big5';
    const suffix = notEmptyString(rangeKey)
      ? rangeKey === 'mid'
        ? 'ave'
        : 'high'
      : '';
    const midKey = isJungian
      ? [domain, result].join('_').toLowerCase()
      : facet > 0
      ? ['facet', facet].join('_')
      : 'all';
    const resultKey = isJungian ? suffix : result.toLowerCase();
    const parts = [[prefix, 'results_'].join('_'), domLetter, midKey];

    if (notEmptyString(resultKey)) {
      parts.push(resultKey);
    }
    const key = parts.join('_');
    const fbItem = feedbackItems.find(item => item.key === key);
    if (fbItem instanceof Object) {
      return fbItem.values.map(v => {
        const { lang, text } = v;
        return { lang, text };
      });
    }
  }
  return [];
};

const analyseBig5Answers = (
  answers: FacetedSet[] = [],
  feedbackItems: Snippet[] = [],
) => {
  const hasFeedback =
    feedbackItems instanceof Array && feedbackItems.length > 5;
  const domainItems: Map<string, any> = new Map();
  const domains = ['O', 'C', 'E', 'A', 'N'];
  const facets = [1, 2, 3, 4, 5, 6];
  domains.forEach(domKey => {
    const dItems = answers.filter(an => an.domain === domKey);
    const score = dItems.map(item => item.score).reduce((a, b) => a + b, 0);
    const count = dItems.length;
    const labelItem = facetedBig5Categories.find(ct => ct.key === domKey);
    if (labelItem instanceof Object) {
      const result = calculateFacetedResult(score, count);
      const item = {
        score,
        count,
        pc: calcFacetedItemPercent(score, count),
        title: labelItem.title,
        result,
        feedback: hasFeedback
          ? matchFacetedFeedback(feedbackItems, domKey, 0, result)
          : [],
      };
      const facetResults = facets.map(facet => {
        const fItems = dItems.filter(an => an.facet === facet);
        const score = fItems.map(item => item.score).reduce((a, b) => a + b, 0);
        const count = fItems.length;
        const result = calculateFacetedResult(score, count);
        const flItem = labelItem.facets.find(fc => fc.num === facet);
        const facetTitle =
          flItem instanceof Object ? flItem.title : facet.toString();
        return {
          num: facet,
          title: facetTitle,
          score,
          count,
          pc: calcFacetedItemPercent(score, count),
          result: calculateFacetedResult(score, count),
          feedback: hasFeedback
            ? matchFacetedFeedback(feedbackItems, domKey, facet, result)
            : [],
        };
      });
      domainItems.set(domKey, {
        ...item,
        facets: facetResults,
      });
    }
  });
  return domainItems;
};

const calcJungianScaleResult = (
  domKey = '',
  answers: FacetedSet[],
  hasScore = true,
) => {
  let result = 0;
  const formula = facetedJungianFormulae.find(f => f.domain === domKey);
  if (formula instanceof Object) {
    result = formula.start;
    formula.sequence.forEach((op, index) => {
      const rowVal = hasScore ? answers[index].score : answers[index].value;
      if (index < answers.length) {
        if (op === '+') {
          result += rowVal;
        } else {
          result -= rowVal;
        }
      }
    });
  }
  return result;
};

const analyseJungianAnswers = (
  answers: FacetedSet[] = [],
  feedbackItems: Snippet[] = [],
) => {
  const hasFeedback =
    feedbackItems instanceof Array && feedbackItems.length > 5;
  const domainItems: Map<string, any> = new Map();
  const domains = ['IE', 'SN', 'FT', 'JP'];
  domains.forEach(domKey => {
    const dItems = answers.filter(an => an.domain === domKey);
    dItems.sort((a, b) => a.facet - b.facet);
    const subtotal = dItems.map(item => item.score).reduce((a, b) => a + b, 0);
    const count = dItems.length;
    const labelItem = facetedJungianCategories.find(ct => ct.key === domKey);
    const score = calcJungianScaleResult(domKey, dItems);
    // to be determined
    const pc = calcFacetedItemPercent(
      score,
      count,
      defaultFacetedScaleRange,
      true,
    );
    const domKeyIndex = pc <= 50 ? 0 : 1;
    const domResult = pc <= 50 ? (50 - pc) * 2 : (pc - 50) * 2;
    const resultLetter = domKey.charAt(domKeyIndex);
    const rangeKey = domResult < 20 ? 'mid' : 'end';
    const result = [resultLetter, rangeKey, domResult].join('_');
    if (labelItem instanceof Object) {
      const item = {
        title: labelItem.title,
        score,
        count,
        pc,
        result,
        subtotal,
        feedback: hasFeedback
          ? matchFacetedFeedback(feedbackItems, domKey, 0, resultLetter)
          : [],
        feedback2: hasFeedback
          ? matchFacetedFeedback(
              feedbackItems,
              domKey,
              0,
              resultLetter,
              rangeKey,
            )
          : [],
      };
      domainItems.set(domKey, {
        ...item,
      });
    }
  });
  return domainItems;
};

export interface JungianSet {
  I?: number;
  E?: number;
  F?: number;
  T?: number;
  J?: number;
  P?: number;
  S?: number;
  N?: number;
}

export const synopsiseJungianAnswers = (
  answers: FacetedSet[] = [],
  rescale = 0,
  asRanges = false,
): Map<string, number> => {
  const domainItems: Map<string, number> = new Map();
  const domains = ['IE', 'SN', 'FT', 'JP'];
  const hasAnswers = answers.length > 0 && answers[0] instanceof Object;
  const ansKeys = hasAnswers ? Object.keys(answers[0]) : [];
  const hasFacet = ansKeys.includes('facet');
  const hasScore = ansKeys.includes('score');
  if (hasAnswers) {
    domains.forEach(domKey => {
      const dItems = answers
        .filter(an => an.domain === domKey)
        .map(ans => {
          if (rescale !== 0) {
            if (hasScore) {
              return { ...ans, score: ans.score + rescale };
            } else {
              return { ...ans, value: ans.value + rescale };
            }
          } else {
            return ans;
          }
        });
      dItems.sort((a, b) => {
        return hasFacet ? a.facet - b.facet : a.subdomain - b.subdomain;
      });
      const count = dItems.length;
      const score = calcJungianScaleResult(domKey, dItems, hasScore);
      // to be determined
      const pc = calcFacetedItemPercent(score, count, defaultFacetedScaleRange);
      const domKeyIndex = pc <= 50 ? 0 : 1;
      const domResult = pc <= 50 ? (50 - pc) * 2 : (pc - 50) * 2;
      const resultLetter = domKey.charAt(domKeyIndex);
      if (asRanges) {
        const domRangeVal = domKeyIndex < 1 ? 0 - domResult : domResult;
        domainItems.set(domKey, domRangeVal);
      } else {
        const upper50Val = 50 + (domResult / 2);
        domainItems.set(resultLetter, upper50Val);
      }
    });
  }
  return domainItems;
};

export const summariseJungianAnswers = (
  answers: FacetedSet[] = [],
): JungianSet => {
  const domainItems = synopsiseJungianAnswers(answers);
  return Object.fromEntries(domainItems.entries());
};

export const jungianAnswersToResults = (
  answers: FacetedSet[] = [],
): SimpleResult[] => {
  const domainMap = synopsiseJungianAnswers(answers, 3, true);
  return [...domainMap.entries()].map(([domain, value]) => {
    return {
      domain,
      value,
    };
  });
};

const mergeJungianFeedback = (obj = null, fbItems: Snippet[] = []) => {
  if (obj instanceof Object) {
    Object.keys(obj).forEach(key => {
      const [resultLetter, rangeKey, _] = obj[key].result.split('_');
      obj[key].feedback = matchFacetedFeedback(fbItems, key, 0, resultLetter);
      obj[key].feedback2 = matchFacetedFeedback(
        fbItems,
        key,
        0,
        resultLetter,
        rangeKey,
      );
    });
  }
  return obj;
};

const mergeFactedFeedback = (obj = null, fbItems: Snippet[] = []) => {
  if (obj instanceof Object) {
    Object.keys(obj).forEach(key => {
      obj[key].feedback = matchFacetedFeedback(
        fbItems,
        key,
        0,
        obj[key].result,
      );
      if (obj[key].facets instanceof Array) {
        obj[key].facets.forEach(fc => {
          fc.feedback = matchFacetedFeedback(
            fbItems,
            key,
            obj[key].num,
            obj[key].result,
          );
        });
      }
    });
  }
  return obj;
};

export const mergePsychometricFeedback = (
  obj = null,
  fbItems: Snippet[] = [],
  type = 'faceted',
) => {
  if (type === 'jungian') {
    return mergeJungianFeedback(obj, fbItems);
  } else {
    return mergeFactedFeedback(obj, fbItems);
  }
};

export const analyseAnswers = (
  type = 'faceted',
  answers: FacetedSet[],
  feedbackItems: Snippet[] = [],
) => {
  const domainItems =
    type === 'jungian'
      ? analyseJungianAnswers(answers, feedbackItems)
      : analyseBig5Answers(answers, feedbackItems);
  return Object.fromEntries(domainItems.entries());
};

export const transformUserPreferences = (
  preference: Preference,
  surveys = [],
  multiscaleData = [],
) => {
  let score = null;
  let surveyKey = '';
  const pref = preference instanceof Model ? preference.toObject() : preference;
  if (pref instanceof Object) {
    const { key, value } = pref;
    const survey = surveys.find(s => s.items.some(opt => opt.key === key));
    const hasSurvey = survey instanceof Object;
    const question = hasSurvey
      ? survey.items.find(opt => opt.key === key)
      : null;
    surveyKey = hasSurvey ? survey.key : '';
    if (question instanceof Object) {
      const { type } = question;
      switch (type) {
        case 'multiple_key_scale':
          score = transformMultipleKeyScaleQuestions(
            question,
            value,
            multiscaleData,
          );
          break;
      }
    }
  }
  return notEmptyString(surveyKey)
    ? score !== null
      ? { survey: surveyKey, ...pref, score }
      : { survey: surveyKey, ...pref }
    : pref;
};

export const filterMapSurveyByType = (
  preferences: any[],
  sType = '',
  facetedQuestions,
): FacetedSet[] => {
  return preferences
    .filter(pr => pr.type === sType)
    .map(pref => normalizeFacetedAnswer(pref, facetedQuestions));
};

const polarityDifferencesToScore = (rows: KeyNumValue[] = []): number => {
  return rows.length > 0 ? rows.map(row => 100 - Math.abs(row.value) ).reduce((a, b) => a + b, 0) / rows.length : -1;
}

const extractLettersFromJungianSummary = (jungian: KeyNumValue[] = []) => {
  const spectra = ['IE', 'SN', 'FT', 'JP'];
  return spectra.map(pair => {
    const item = jungian.find(row => row.key === pair);
    if (item instanceof Object) {
      return item.value < 0 ? pair.substring(0,1) : pair.substring(1,2);
    } else {
      return '';
    }
  }).join('').toLowerCase();
}

export const toSimplePolarityValues = (jungian: KeyNumValue[] = []) => {
  const mp: Map<string, number> = new Map();
  jungian.forEach(({key, value}) => {
    const isNeg = value < 0;
    const letter = isNeg ? key.substring(0, 1) : key.substring(1, 2)
    const numVal = 50 + (Math.abs(value) / 2);
    mp.set(letter, numVal);
  });
  return Object.fromEntries(mp.entries());
}

export const compareJungianPolarities = (jungianRef: KeyNumValue[] = [], jungian: KeyNumValue[] = []) => {
  const rows = jungianRef.map(row => {
    const { key, value } = row;
    const other = jungian.find(r2 => r2.key === key);
    const matched = other instanceof Object;
    const otherVal = matched ? other.value : 0;
    return { 
      key,
      value: value - otherVal, 
      matched
    }
  }).filter(row => row.matched);
  const score = polarityDifferencesToScore(rows);
  const entries: any[] = rows.map(row => {
    const { key, value } = row;
    return [ key, value ]
  });
  entries.push(['score', score]);
  const letters = extractLettersFromJungianSummary(jungian);
  entries.push(['letters', letters]);
  entries.push(['values', toSimplePolarityValues(jungian)]);
  return Object.fromEntries(entries);
}

export const extractDefaultJungianPersonalityTypeLetters = (userObj = null) => {
  let defaultLetters = '';
  if (userObj instanceof Object) {
    const {preferences} = userObj;
    if (preferences instanceof Array) {
      const defaultLetterRow = preferences.find(pr => pr.key === 'jungian_type');
      if (defaultLetterRow instanceof Object) {
        defaultLetters = defaultLetterRow.value;
      }
    }
  }
  return defaultLetters;
}

export const assignJungianKeyValues = (defaultLetters = ''): KeyNumValue[] => {
  const letters = defaultLetters.toUpperCase();
  const pairs = ['IE', 'SN', 'FT', 'JP'];
  return pairs.map(key => {
    const [l1, l2] = key.split('');
    const value = letters.includes(l1) ? -50 : letters.includes(l2) ? 50 : 0;
    return {
      key,
      value
    }
  })
}

export const assignJungianDomainValues = (defaultLetters = ''): SimpleResult[] => {
  const kvs = assignJungianKeyValues(defaultLetters);
  return kvs.map(item => {
    const {key, value} = item;
    return { 
      domain: key,
      subdomain: 0,
      value
    }
  });
}

export const extractSurveyScoresByType = (user: any = null, type = 'jungian'): KeyNumValue[] => {
  if (user instanceof Object && Object.keys(user).includes('surveys') && user.surveys instanceof Array) {
    const scoreSet = user.surveys.find(row => row.type === type);
    if (scoreSet instanceof Object) {
      if (scoreSet.values instanceof Array) {
        return scoreSet.values.map(row => {
          const {domain, value } = row;
          return { 
            key: domain,
            value
          }
        });
      }
    }
  }
  if (type === 'jungian') {
    const defaultLetters = extractDefaultJungianPersonalityTypeLetters(user).toUpperCase();
    if (defaultLetters.length === 4) {
      return assignJungianKeyValues(defaultLetters)
    }
  }
  return [];
}

export const extractFromBasicJungianSummary = (user = null) => {
  return toSimplePolarityValues(extractSurveyScoresByType(user, 'jungian'));
}
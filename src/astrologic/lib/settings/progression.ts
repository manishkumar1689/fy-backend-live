import { notEmptyString } from '../../../lib/validators';
import {
  keyValuesToSimpleObject,
  simpleObjectToKeyValues,
} from '../../../lib/converters';
import { calcAyanamsha, calcLngsJd } from '../core';
import { julToISODate } from '../date-funcs';
import { KeyLng } from '../interfaces';
import { currentJulianDay, dateStringToJulianDay, julToDateParts } from '../julian-date';
import { calcAspect } from '../calc-orbs';
import { subtractLng360 } from '../math-funcs';

export interface JDProgress {
  pd: number;
  jd: number;
  dt?: string;
  progressDt?: string;
}

export interface ProgressBodySet extends JDProgress {
  bodies: KeyLng[];
  ayanamsha: number;
}

/*
Tropical year (Sun passage from one mean vernal equinox to the next): 365.242199
Sidereal Year (Earth's complete orbit around the Sun relative to fixed stars): 365.256366
Anomalistic year (Earth's passage from one perihelion to another): 365.259636
*/
export const astroYearLength = {
  tropical: 365.242199,
  sidereal: 365.256366,
  anomalistic: 365.259636,
};

export const P2AspectMatchScores = {
	"su_ve": {
		default: {
			entry:7, 
			peak:10, 
			exit:5
		}
	},
	"ve_ve": {
		default: {
			entry:6, 
			peak:8, 
			exit:5
		}
	},
	"ve_ma": {
		square: {
			"entry":5, 
			peak:8, 
			"exit":6
		},
		default: {
			entry: 6, 
			peak: 8, 
			exit: 5
		}
	}
}

export const matchP2ScoreSet = (refConfig: any = {}, key = '', frac = 0, isEntry = false) => {
  const parts = key.split('_');
  let scSet = { entry: 0, peak: 0, exit: 0, min: 0, score: 0 };
  if (parts.length > 2) {
    const pair1 = [parts[0], parts[1]].join('_');
    const pair2 = [parts[1], parts[0]].join('_');
    const aspect = parts.slice(2).join('_');
    const scKeys = Object.keys(refConfig);
    const scSetData = scKeys.includes(pair1) ? refConfig[pair1] : scKeys.includes(pair2) ? refConfig[pair2] : null;
    if (scSetData instanceof Object) {
      const aspectKeys = Object.keys(scSetData);
      if (aspectKeys.includes(aspect)) {
        scSet = scSetData[aspect];
      } else if (aspectKeys.includes('default')) {
        scSet = scSetData.default;
      }
      if (scSet.peak > 0) {
        scSet.min = isEntry ? scSet.entry : scSet.exit;
        const scoreDiff = scSet.peak - scSet.min;
        scSet.score = (frac * scoreDiff) + scSet.min;
      }
    }
  }
  return scSet;
}

export const getYearLength = (yearType = 'tropical') => {
  switch (yearType) {
    case 'sidereal':
      return astroYearLength.sidereal;
    case 'anomalistic':
      return astroYearLength.anomalistic;
    default:
      return astroYearLength.tropical;
  }
};

export const toProgressionJD = (
  birthJd = 0,
  refJd = 0,
  yearType = 'tropical',
) => {
  const ageInDays = refJd - birthJd;
  const projectedDuration = ageInDays / getYearLength(yearType);
  return birthJd + projectedDuration;
};

export const toProgressionJdIntervals = (
  birthJd = 0,
  numYears = 22,
  numPerYer = 4,
  inFuture = 0.25,
  yearType = 'tropical',
): JDProgress[] => {
  //const refJd = currentJulianDay();
  const currYear = new Date().getFullYear();
  const yl = getYearLength(yearType);
  const numYearsAgo = numYears * (1 - inFuture);
  const startYearFl = currYear - numYearsAgo;
  const startYear = Math.floor(startYearFl);
  const dateStr = [
    [startYear.toString(), '01', '01'].join('-'),
    '00:00:00',
  ].join('T');
  const startYearAdd = startYearFl % 1;
  const startJd = dateStringToJulianDay(dateStr) + startYearAdd * yl;
  //const startJd = refJd - numYears * (1 - inFuture) * yl;
  const startProgressionJd = toProgressionJD(birthJd, startJd);
  const jdPairs: JDProgress[] = [{ pd: startProgressionJd, jd: startJd }];
  const numExtraSteps = numYears * numPerYer;
  const stepSize = 1 / numPerYer;
  const yearStep = stepSize * yl;
  for (let i = 1; i <= numExtraSteps; i++) {
    const pd = startProgressionJd + i * stepSize;
    const jd = startJd + i * yearStep;
    jdPairs.push({ pd, jd });
  }
  return jdPairs;
};

export const mergeIsoDatestoProgressSet = (row: JDProgress): JDProgress => {
  const progressDt = julToISODate(row.pd);
  const dt = julToISODate(row.jd);
  return {
    ...row,
    dt,
    progressDt,
  };
};

export const buildProgressBodySets = async (
  intervals: JDProgress[] = [],
  grahaKeys = ['su', 've', 'ma'],
  addISODates = false,
  ayanamsaKey = 'true_citra',
) => {
  const progressSets = [];
  for (const row of intervals) {
    const ayanamsha = await calcAyanamsha(row.pd, ayanamsaKey);
    const bodies = await calcLngsJd(row.pd, grahaKeys);
    const rowObj = addISODates ? mergeIsoDatestoProgressSet(row) : row;
    if (bodies.length > 0) {
      progressSets.push({
        ...rowObj,
        bodies: keyValuesToSimpleObject(bodies, 'lng'),
        ayanamsha,
      });
    }
  }
  return progressSets;
};

export const buildCurrentProgressPositions = async (
  birthJd = 0,
  currJd = 0,
  grahaKeys = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa'],
  ayanamsaKey = 'true_citra',
  tropical = false
) => {
  const pd = toProgressionJD(birthJd, currJd);
  let ayanamshaValue = 0;
  if (notEmptyString(ayanamsaKey, 5) && ayanamsaKey !== 'tropical') {
    ayanamshaValue = await calcAyanamsha(pd, ayanamsaKey)
  }
  const ayaVal = tropical ? 0 : ayanamshaValue;
  const bodies = await calcLngsJd(pd, grahaKeys, ayaVal);
  return { pd, bodies, ayanamshaValue };
};

export const buildProgressSetPairs = async (
  jd1 = 0,
  jd2 = 0,
  yearsInt,
  perYear = 4,
  futureFrac = 0.25,
  progressKeys = ['su', 've', 'ma'],
  showIsoDates = false,
) => {
  const intervalsP1 = toProgressionJdIntervals(
    jd1,
    yearsInt,
    perYear,
    futureFrac,
  );
  const intervalsP2 = toProgressionJdIntervals(
    jd2,
    yearsInt,
    perYear,
    futureFrac,
  );
  const p1Set = await buildProgressBodySets(
    intervalsP1,
    progressKeys,
    showIsoDates,
  );
  const p2Set = await buildProgressBodySets(
    intervalsP2,
    progressKeys,
    showIsoDates,
  );
  return {
    p1: p1Set,
    p2: p2Set,
  };
};

export const buildSingleProgressSet = async (
  jd = 0,
  numSamples = 22,
  progressKeys = ['su', 've', 'ma'],
  showIsoDates = false,
  perYear = 2,
  yearsAgo = 0
) => {
  const numYears = numSamples / perYear;
  const futureFrac = (numYears - yearsAgo) / numYears;
  const intervals = toProgressionJdIntervals(jd, numYears, perYear, futureFrac);
  const progSet = await buildProgressBodySets(
    intervals,
    progressKeys,
    showIsoDates,
  );
  return progSet;
};

export const buildSimpleProgressSetPairs = async (
  jd1 = 0,
  jd2 = 0,
  showIsoDates = false
) => {
  return await buildProgressSetPairs(jd1, jd2, 10,2, 0.8, ['su', 've', 'ma'],
    showIsoDates,
  )
}

export const calcProgressAspectsFromProgressData = (pData: any, applyAyanamsha = true) => {
  const { p1, p2} = pData;
  const gPairs = [['su', 've'], ['ve', 've'], ['ve', 'ma']];
  const aspKeys = ["conjunction","opposition", "trine", "square"];
  let rows = [];
  if (p1 instanceof Object && p2 instanceof Object) {
    if (p1 instanceof Array && p2 instanceof Array) {
      const numP2 = p2.length;
      rows = p1.filter((_, itemIndex) => itemIndex < numP2).map((item, itemIndex) => {
        const item2 = p2[itemIndex];
        const pairs = gPairs.map(pair => {
          const gps = pair[0] === pair[1] ? [pair] : [pair, [pair[1], pair[0]]];
          return gps.map(([k1, k2]) => {
              const aspectRows = aspKeys.map(aKey => {
                const lng1 = applyAyanamsha ? subtractLng360(item.bodies[k1], item.ayanamsa) : item.bodies[k1];
                const lng2 = applyAyanamsha ? subtractLng360(item2.bodies[k2], item2.ayanamsa) : item2.bodies[k2];
                const asp = calcAspect(lng1, lng2, aKey);
                return { key: aKey, ...asp };
              });
              const first = aspectRows[0];
              const { lng1, lng2 } = first;
              return { k1, k2, lng1, lng2, aspects: aspectRows.filter(row => row.aspectDiff <= 10).map(row => {
                const { key, aspectDiff } = row;
                return {
                  key,
                  distance: aspectDiff
                }
              })
            }
          })
        }).reduce((a,b) => a.concat(b));
        
        return {
          pd: item.pd,
          jd: item.jd,
          dt: item.dt,
          pairs
        }
      });
    }
  }
  return rows;
}

export const calcProgressAspectsFromJds = async (jd1 = 0, jd2 = 0, applyAyanamsha = true, showIsoDates = false) => {
  const pd = await buildSimpleProgressSetPairs(jd1, jd2, showIsoDates);
  return calcProgressAspectsFromProgressData(pd, applyAyanamsha);
}

export const progressItemsToDataSet = (items: any[] = [], jd1 = 0, jd2 = 0) => {
let num = 0;
  let numWithAspects = 0;
  if (items instanceof Array) {
    num = items.length;
    numWithAspects = items.filter(item => item.pairs.some(pair => pair.aspects.length > 0)).length;
  }
  return {
    num,
    numWithAspects,
    jd1,
    jd2,
    items
  }
}

export const calcProgressAspectDataFromProgressItems = (p1: any[] = [], p2: any[] = []) => {
  const pdSet = { p1, p2 };
  const items = calcProgressAspectsFromProgressData(pdSet, false);
  return progressItemsToDataSet(items);
}

export const shortenAspectComboKey = (key: string): string => {
  return key.length > 9 && key.includes('_') ? key.substring(0,9) : key.length > 3 ? key.substring(0, 3) : key;
}

export const calcProgressSummary = (items: any[] = [], widenOrb = false, customConfig = null, maxDistance = 2 + 1/60, asArraySets = false) => {
  const mp: Map<string, any> = new Map();
  const currJd = currentJulianDay();
  const initMaxOrb = widenOrb? maxDistance * 1.5 : maxDistance;
  let pc = 0;
  items.forEach(item => {
    if (item instanceof Object && Object.keys(item).includes('pairs')) {
      for (const pair of item.pairs) {
        if (pair.aspects.length > 0) {
          for (const asItem of pair.aspects) {
            if (asItem.distance <= initMaxOrb) {
              const mk = [pair.k1, pair.k2, asItem.key].join('_');
              const mItems = mp.has(mk)? mp.get(mk) : [];
              mItems.push({
                days: item.jd - currJd,
                dist: asItem.distance
              });
              mp.set(mk, mItems);
            }
          }
        }
      }
    }
  })
  if (mp.size > 0) {
    const scores: any[] = [];
    const justOverHalfYear = 368/2;
    const justOverHalfYearAgo = 0 - justOverHalfYear;
    const orb = 2 + (1/60);
    const refConfig = customConfig instanceof Object? customConfig : P2AspectMatchScores;
    for (const [key, values] of mp) {
      const currValues = values.filter(row => row.days < justOverHalfYear && row.days > justOverHalfYearAgo);
      const minusVals = currValues.filter(row => row.days < 0);
      const plusVals = currValues.filter(row => row.days > 0);
      minusVals.sort((a, b) => b.days - a.days);
      plusVals.sort((a, b) => a.days - b.days);
      
      if (plusVals.length > 0) {
        const bestPlus = plusVals[0];
        const hasMinus = minusVals.length > 0;
        const bestMinus = hasMinus ? minusVals[0] : bestPlus;
        const dist = bestPlus.days - bestMinus.days;
        const prog = (dist - bestPlus.days) / dist;
        const diff = bestPlus.dist - bestMinus.dist;
        const value = bestMinus.dist + (diff * prog);
        const isEntry = diff < 0;
        const frac = (orb - value) / orb;
        const scoreSet = matchP2ScoreSet(refConfig, key, frac, isEntry);
        if (scoreSet.peak > 0) {
          if (frac >= 0) {
            scores.push([key, { 
              value,
              frac,
              isEntry,
              score: scoreSet.score,
              max: scoreSet.peak
            }]);
          }
        }
        
      }
    }
    // if the source set of aspects uses a wider orb, to calculate entry and exit times,
    // post-filter results to return only those that fall within the orb
    if (widenOrb) {
      for (const [key, values] of mp) {
        if (key !== 'scores' && values instanceof Array) {
          const filteredVals = values.filter(row => row.dist <= maxDistance);
          if (filteredVals.length < 1) {
            mp.delete(key);
          } else {
            mp.set(key, filteredVals);
          }
        }
      }
    }
    if (scores.length > 0) {
      const genScore = scores.map(entry => entry[1].score).reduce((a,b) => a + b, 0);
      const genMax = scores.map(entry => entry[1].max).reduce((a,b) => a + b, 0);
      pc = (genScore / genMax * 100 / 2) + 50;
      //mp.set('general', { score: genScore, max: genMax});
      if (asArraySets) {
        const scoreItems = scores.map(([key, item]) => { return { key: shortenAspectComboKey(key), ...item} });
        mp.set('scores', scoreItems);
      } else {
        mp.set('scores', Object.fromEntries(scores));
      }
    }
  }
  mp.set('percent', pc);
  if (asArraySets) {
    let scores = [];
    let percent = 0;
    const aspects = [];
    for (const [key, val] of mp.entries()) {
      switch (key) {
        case 'percent':
          percent = val;
          break;
        case 'scores':
          scores = val;
          break;
        default:
          aspects.push({ key: shortenAspectComboKey(key), values: val});
          break;
      }
    }
    return { aspects, scores, percent };
  } else {
    return Object.fromEntries(mp.entries());
  }
}

export const calcProgressSummaryMembers = (items: any[] = [], widenOrb = false, customConfig = null, maxDistance = 2 + 1/60) => {
  return calcProgressSummary(items, widenOrb, customConfig, maxDistance, true)
}

export const buildSingleProgressSetKeyValues = async (jd = 0, yearsAgo = 2, years = 11, perYear = 2) => {
  const numSamples = years * perYear;
  const pgs = await buildSingleProgressSet(jd, numSamples, ['su', 've', 'ma'], false, perYear, yearsAgo);
  return pgs.map(pItem => {
    const bodies = simpleObjectToKeyValues(pItem.bodies);
    return { ...pItem, bodies };
  });
};

export const mergeProgressSets = async (
  data: any = null,
  cKey = 'astro_pair_ 1',
  yearsInt = 20,
  perYear = 4,
  futureFrac = 0.25,
) => {
  if (
    data instanceof Object &&
    Object.keys(data).includes('miniCharts') &&
    data.miniCharts instanceof Array &&
    data.miniCharts.length > 0
  ) {
    const matchedIndex = data.miniCharts.findIndex(mc => mc.key === cKey);
    const mcIndex = matchedIndex >= 0 ? matchedIndex : 0;
    const miniC = data.miniCharts[mcIndex];
    if (miniC instanceof Object && data instanceof Object) {
      const { p1, p2 } = miniC;
      if (p1 instanceof Object && p2 instanceof Object) {
        const pData = await buildProgressSetPairs(
          p1.jd,
          p2.jd,
          yearsInt,
          perYear,
          futureFrac,
        );
        data.miniCharts[mcIndex] = {
          ...miniC,
          p1: {
            ...p1,
            progressSets: pData.p1,
          },
          p2: {
            ...p2,
            progressSets: pData.p2,
          },
        };
      }
    }
  }
  return data;
};

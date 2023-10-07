import { notEmptyString } from 'src/lib/validators';
import { matchNakshatra } from './core';
import { julToDateFormat, julToISODate, julToUnixTime } from './date-funcs';
import { TransitionItem } from './interfaces';
import { unixTimeToJul } from './julian-date';
import { Chart } from './models/chart';
import { GeoLoc } from './models/geo-loc';
import { matchDikBalaTransition } from './settings/graha-values';
import {
  BirdGrahaSet,
  calcValueWithinOrb,
  extractAllYamasWithSubs,
  filterDashaLordByObjectType,
  mapBirdSet,
  mapLords,
  matchPeriodsWithPPScoresOnly,
  matchTransitionItemRange,
  panchaPakshiDayNightSet,
  PPRule,
  RuleDataSet,
  toAllYamaSubs,
  toTransitKey,
  TransitionOrb,
  translateTransitionKey,
} from './settings/pancha-pakshi';

export const addTransitionItemsWithinRange = (
  transitions: TransitionItem[],
  items: any[],
  key: '',
  startJd = 0,
  endJd = 0,
  transposed = false,
) => {
  if (items instanceof Array) {
    items.forEach(item => {
      if (
        ['min', 'max'].includes(item.key) === false &&
        item.value >= startJd &&
        item.value <= endJd
      ) {
        transitions.push({
          key,
          type: item.key,
          jd: item.value,
          transposed,
        });
      }
    });
  }
};

export const process5PTransition = (
  r: PPRule,
  chart: Chart,
  allSubs = [],
  transitions: TransitionItem[],
  birdGrahaSet: BirdGrahaSet,
): RuleDataSet => {
  const isTr = ['as', 'ds', 'ic', 'mc', 'dik_bala_transition'].includes(
    r.context,
  );
  const trRef = translateTransitionKey(r.key, isTr);
  const matchedRanges: TransitionOrb[] = [];
  const transposed = r.from === 'birth';
  let subs = [];
  let grahaKeys = [];
  const startJd = allSubs[0].start;
  const endJd = allSubs.length > 49 ? allSubs[49].end : 0;
  /* const midJd = allSubs.length > 49 ? allSubs[24].end : 0;
  let matchDayOnly = false; */
  if (r.key.endsWith('_graha')) {
    const trKey = toTransitKey(r.context);
    if (r.key.includes('ing_') && r.key.startsWith('yama')) {
      const actKey = r.key.split('_')[1];
      allSubs
        .filter(s => s.key === actKey)
        .filter(s => {
          const relRows = transitions.filter(
            rt =>
              s.rulers.includes(rt.key) &&
              rt.transposed === transposed &&
              rt.type === trKey,
          );
          relRows.forEach(rr => {
            if (Object.keys(rr).includes(trKey)) {
              if (rr[trKey].jd >= s.start && rr[trKey].jd < s.end) {
                const mRange = matchTransitionItemRange(rr);
                matchedRanges.push(mRange);
                r.addMatch(mRange.start, mRange.end, 'orb', r.score);
              }
            }
          });
        });
    } else if (r.key.startsWith('birth_bird_')) {
      grahaKeys = birdGrahaSet.matchGrahas('birth', true);
    } else if (r.key.includes('ruling_bird_')) {
      grahaKeys = birdGrahaSet.matchGrahas('ruling', true);
    } else if (r.key.includes('dying_bird_')) {
      grahaKeys = birdGrahaSet.matchGrahas('dying', true);
    }
    //matchDayOnly = r.key.includes('day_');
  } else if (r.key.length === 2) {
    grahaKeys = [r.key];
  }
  const isDahsha = r.context.startsWith('dasha_');
  const isDasha2 = !isDahsha && r.context.startsWith('antardasha_');
  if (isDahsha || isDasha2) {
    const refDashaLord = isDasha2
      ? birdGrahaSet.dasha2Lord
      : birdGrahaSet.dashaLord;
    subs = filterDashaLordByObjectType(
      refDashaLord,
      allSubs,
      birdGrahaSet,
      r.key,
    );
    subs.forEach(sub => {
      r.addMatch(sub.start, sub.end, 'subyama', r.score);
    });
  }
  const isLord = r.context.startsWith('lord');
  let filterByGrahasAndAction = isLord;
  if (isLord) {
    grahaKeys = mapLords(chart, r.context);
  } else if (r.key === 'yoga_karaka') {
    grahaKeys = [chart.yogaKaraka];
    filterByGrahasAndAction = true;
  } else if (r.key === 'brighu_bindu') {
    grahaKeys = ['brghuBindu'];
    filterByGrahasAndAction = true;
  } else if (r.key.endsWith('yogi_point')) {
    grahaKeys = r.context.includes('avayogi') ? ['avayogi'] : ['yogi'];
    filterByGrahasAndAction = true;
  } else if (r.key.endsWith('yogi_graha')) {
    const yp = r.context.includes('avayogi')? chart.calcAvayogiSphuta() : chart.calcYogiSphuta();
    const yogiSphutaNk = matchNakshatra(yp);
    if (notEmptyString(yogiSphutaNk.ruler)) {
      grahaKeys = [yogiSphutaNk.ruler];
      filterByGrahasAndAction = true;
    }
  } else if (r.key.endsWith('fortune')) {
    // grahaKeys = ['lotOfFortune'];
    grahaKeys = ['fortune'];
    filterByGrahasAndAction = true;
  } else if (r.key.endsWith('spirit')) {
    //grahaKeys = ['lotOSpirit'];
    grahaKeys = ['spirit'];
    filterByGrahasAndAction = true;
  }
  if (filterByGrahasAndAction) {
    subs = allSubs.filter(
      s => s.key === r.action && s.rulers.some(gk => grahaKeys.includes(gk)),
    );
    subs.forEach(sub => {
      r.addMatch(sub.start, sub.end, 'subyama', r.score);
    });
  }
  if (isTr) {
    const lcGrKeys = grahaKeys.map(gk => gk.toLowerCase());
    const preFilterByKeys = true;
    const relTrs = preFilterByKeys ? transitions.filter(tr => {
      const rKey = tr.key.toLowerCase().replace('2', '');
      return rKey === trRef.toLowerCase() || lcGrKeys.includes(rKey);
    }) : transitions;
    if (relTrs.length > 0) {
      for (const relTr of relTrs) {
        const refK = toTransitKey(r.action);
        const rk = refK.startsWith('dik') ? matchDikBalaTransition(refK) : refK;
        if (relTr.type === rk && relTr.transposed === r.isTransposed) {      
          const mr = matchTransitionItemRange(relTr);
          if (mr instanceof TransitionOrb) {
            if (mr.end > startJd && mr.start < endJd) {
              matchedRanges.push(mr);
              r.addMatch(mr.start, mr.end, 'orb', r.score);
            }
          }
        }
      }
    }
  }
  const matched = matchedRanges.length > 0 || subs.length > 0;

  return {
    rule: r,
    isTr,
    isLord,
    matchedRanges,
    matched,
    subs,
    trRef,
  };
};

export const addMatched5PTransitions = (
  chart: Chart,
  allSubs: any[],
  rules: PPRule[] = [],
  transitions: TransitionItem[] = [],
  birdGrahaSet: BirdGrahaSet,
) => {
  for (const r of rules) {
    for (const subR of r.transitConditions()) {
      process5PTransition(subR, chart, allSubs, transitions, birdGrahaSet);
    }
  }
};

export const addAllTransitionItemsWithinRange = (
  transitions: TransitionItem[] = [],
  transDataItems: any[] = [],
  startJd = 0,
  endJd = 0,
  transposed = false,
) => {
  transDataItems.forEach(row => {
    const { key, items } = row;
    if (items instanceof Array) {
      addTransitionItemsWithinRange(
        transitions,
        items,
        key,
        startJd,
        endJd,
        transposed,
      );
    }
  });
};

export const matchPPRulesToJd = (
  minJd = 0,
  rules: PPRule[],
  endSubJd = -1,
  skipTransitions = false,
) => {
  let score = 0;
  let ppScore = 0;
  const names: string[] = [];
  const peaks = [];
  const starts: number[] = [];
  const ends: number[] = [];
  for (const rule of rules) {
    if (rule.isMatched) {
      // a rule may only match one in a given minute even if valid match spans may overlap
      let isMatched = false;
      for (const match of rule.validMatches) {
        if (!isMatched && minJd >= match.start && minJd <= match.end) {
          if (match.type === 'orb') {
            if (!skipTransitions) {
              const { fraction, peak } = calcValueWithinOrb(
                minJd,
                match.start,
                match.end,
              );
              if (endSubJd < 0 || (peak <= endSubJd && endSubJd > 0)) {
                score += rule.score * fraction;
                if (names.includes(rule.name) === false) {
                  names.push(rule.name);
                  peaks.push(peak);
                }                
              }
            }
          } else {
            if (rule.validateAtMinJd(minJd)) {
              if (names.includes(rule.name) === false) {
                score += rule.score;
                ppScore += rule.score;
                names.push(rule.name);
              }
            }
          }
          isMatched = true;
          if (starts.indexOf(match.start) < 0) {
            starts.push(match.start);
          }
          if (ends.indexOf(match.end) < 0) {
            ends.push(match.end);
          }
          break;
        }
      }
    }
  }
  starts.sort();
  ends.sort();
  const endJd = ends.length > 0 ? ends[0] : 0;
  const startJd = starts.length > 0 ? starts[starts.length - 1] : 0;
  return { minuteScore: score, ppScore, names, peaks, startJd, endJd };
};

export const processTransitionData = (
  trData = null,
  midNightJd = 0,
  endJd = 0,
) => {
  const transitions: TransitionItem[] = [];
  if (trData instanceof Object) {
    if (trData.current instanceof Array) {
      addAllTransitionItemsWithinRange(
        transitions,
        // trData.currentTransitions,
        trData.current,
        midNightJd,
        endJd,
        false,
      );
    }
    if (trData.transposed instanceof Array) {
      addAllTransitionItemsWithinRange(
        transitions,
        //trData.transposedTransitions,
        trData.transposed,
        midNightJd,
        endJd,
        true,
      );
    }
  }
  return transitions;
};

const roundToInt = (num: number | undefined): number => {
  return typeof num === 'number' ? Math.round(num) : 0;
};

const julToUnixInt = (num: number | undefined): number => {
  return roundToInt(julToUnixTime(num));
};

const toDateVariants = (
  unix: number,
): { jd: number; un: number; dt: string } => {
  const jd = unixTimeToJul(unix);
  const dt = julToDateFormat(jd);
  return {
    jd,
    un: unix,
    dt,
  };
};

const mapToSimplePeak = (item: any) => {
  const { peak, score, start, end } = item;
  return { start, peak, end, max: score };
};

const mapToPeakVariants = (item: any) => {
  const { peak, score, start, end } = item;
  return {
    start: toDateVariants(start),
    peak: toDateVariants(peak),
    end: toDateVariants(end),
    max: score,
  };
};

export const process5PRulesWithPeaks = async (
  chart: Chart,
  span: number[] = [0, 0, 0],
  geo: GeoLoc,
  transitions: TransitionItem[] = [],
  rules: PPRule[] = [],
  cutoff = 80,
  tzOffset = 0,
  showRules = false,
  dateMode = 'simple',
): Promise<Map<string, any>> => {
  const result: Map<string, any> = new Map();
  const [jd, startJd, endJd] = span;
  const dayFirst = true;
  const ppData1 = await panchaPakshiDayNightSet(jd - 1, geo, chart, true);
  //result.pp1 = Object.fromEntries(ppData1.entries());
  const ppData2 = await panchaPakshiDayNightSet(jd, geo, chart, true);
  //result.pp2 = Object.fromEntries(ppData2.entries());
  const birdGrahaSet1 = mapBirdSet(ppData1);
  const birdGrahaSet2 = mapBirdSet(ppData2);
  const yamas1 = extractAllYamasWithSubs(ppData1);
  const yamas2 = extractAllYamasWithSubs(ppData2);
  const periods1 = matchPeriodsWithPPScoresOnly(
    yamas1,
    rules,
    birdGrahaSet1,
    true,
  );

  const periods2 = matchPeriodsWithPPScoresOnly(
    yamas2,
    rules,
    birdGrahaSet2,
    true,
  );
/*  periods1.forEach((outer, oi) => {
  outer.forEach((inner, ii) => {
    console.log(oi, ii, inner);
  })
 }) */
  //const specialPos = ppData2.get('moon').current;

  const allSubs1 = toAllYamaSubs(periods1, dayFirst);
  addMatched5PTransitions(chart, allSubs1, rules, transitions, birdGrahaSet1);
  const allSubs2 = toAllYamaSubs(periods2, dayFirst);
  addMatched5PTransitions(chart, allSubs2, rules, transitions, birdGrahaSet2);
  const totalMatched = rules.filter(r => r.matches.length > 0).length;
  const transitionRules = rules.filter(r =>
    ['birth', 'transit'].includes(r.from),
  );
  const peaks: any[] = [];
  // const jdKeys: strings[] = [];
  const ruleJds: number[] = rules
    .map(r =>
      r.matches
        .map(m => {
          const midJd = (m.start + m.end) / 2;
          return midJd;
        })
        .filter(mj => mj >= startJd && mj <= endJd),
    )
    .reduce((a, b) => a.concat(b));
  transitionRules.forEach(tr => {
    tr.matches.forEach(tm => {
      const midJd = (tm.start + tm.end) / 2;
      const item = matchPPRulesToJd(midJd, rules, -1, true);
      const score = item.ppScore + tr.score;
      const { ppScore, names, startJd, endJd } = item;
      names.push(tr.name);
      peaks.push({
        jd: midJd,
        ppScore,
        trScore: tr.score,
        score,
        ruleKeys: names,
        startJd,
        endJd,
      });
     // jdKeys.push(midJd.toString());
    });
  });
  
  
  const filteredPeaks = peaks
    .filter(p => p.score >= cutoff)
    .map(item => {
      const peak = julToUnixInt(item.jd);
      const dt = julToDateFormat(item.jd, tzOffset, 'iso');
      const diffScore = item.score - item.ppScore;
      const diffCutoff = item.score > cutoff ? item.score - cutoff : 1 / 6;
      const frac = diffCutoff / diffScore;
      const sinceStartPP = peak - julToUnixInt(item.startJd);
      const tillEndStartPP = julToUnixInt(item.endJd) - peak;
      const start =
        sinceStartPP > 0 ? Math.round(peak - sinceStartPP * frac) : peak - 180;
      const end =
        tillEndStartPP > 0
          ? Math.round(peak + tillEndStartPP * frac)
          : peak + 180;
      const duration = end - start;
      return {
        ...item,
        start,
        peak,
        end,
        dt,
        diffScore,
        diffCutoff,
        frac,
        duration,
      };
    });
  /* result.set('periods1', periods1);
  result.set('periods2', periods2); */
  ruleJds.sort();
  result.set('jd', jd);
  result.set('unix', julToUnixInt(jd));
  result.set('spanUnix', [julToUnixInt(startJd), julToUnixInt(endJd)]);
  result.set('sunset', julToUnixInt(ppData2.get('set')));
  result.set('sunrise', julToUnixInt(ppData2.get('rise')));
  filteredPeaks.sort((a, b) => a.peak - b.peak);

  const mapFunc = dateMode === 'all' ? mapToPeakVariants : mapToSimplePeak;
  const mappedPeaks = showRules ? filteredPeaks : filteredPeaks.map(mapFunc);
  result.set('times', mappedPeaks);
  result.set('totalMatched', totalMatched);
  result.set('span', [startJd, endJd]);
  result.set('yamas1', yamas1);
  result.set('yamas2', yamas2);
  if (showRules) {
    peaks.sort((a,b) => a.jd - b.jd);
    result.set('peaks', peaks.map(p => {
      const transDt = julToDateFormat(p.jd, tzOffset, 'iso');
      const startDt = julToDateFormat(p.startJd, tzOffset, 'iso');
      const endDt = julToDateFormat(p.endJd, tzOffset, 'iso');
      return {transDt, startDt, endDt, ...p };
    }));
    result.set('rules', rules);

  /*   const current = trData.current.map(r => {
      const items = r.items.filter(it => ['min','max'].includes(it.key) === false).map(it => {
        const dt = julToDateFormat(it.value, chart.tzOffset, 'iso');
        return { ...it, dt};
      });
      return { ...r, items };
    }); */
    transitions.sort((a, b) => a.jd - b.jd);
    result.set('xtr', transitions.map(item => {
      const dt = julToDateFormat(item.jd, tzOffset, 'iso');
      return { ...item, dt };
    }));
    result.set('tzHrs', tzOffset / 3600);
  }
  result.set('ruleJds', ruleJds);
  return result;
};

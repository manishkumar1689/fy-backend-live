import { notEmptyString, isNumeric } from '../../../lib/validators';
import { Graha } from './graha-set';
import dashaSets from '../settings/dasha-sets';
import {
  nakashatra27Fraction,
  abhijitNakshatraRange,
  nakshatra27,
  nakshatra28,
  nakshatra27Progress,
  nakshatra28Progress,
} from '../helpers';
import { Chart } from './chart';
import { aspectGroups } from '../settings/graha-values';
import { jdToDateTime, julRangeToAge } from '../date-funcs';

export interface NakshatraMatch {
  key: string;
  years?: number;
  from?: number;
  to?: number;
}

export interface DashaData {
  dashas: Array<DashaSpan>;
  set: DashaSet;
  yearLength?: number;
}

export interface DashaSpanItem {
  key: string;
  nakNum?: number;
  startJd: number;
  endJd: number;
  depth: number;
  children: DashaSpanItem[];
  age?: any;
  system?: string;
}

export interface DashaDegSpan {
  span: DashaSpan;
  startDeg?: number;
  endDeg?: number;
  startJd?: number;
  endJd?: number;
  years?: number;
  inRange?: boolean;
  level?: number;
}

export const defaultDashaSpanItem = {
  key: '',
  nakNum: 0,
  startJd: 0,
  endJd: 0,
  depth: 0,
  start: '',
  end: '',
  iconClasses: [],
  children: [],
  age: null,
  system: 'vimshottari',
};

export const calcDashaSpans = (
  ds: DashaSet,
  nakNum: number,
  startJd: number,
  endJd: number,
  depth = 0,
  system = 'vimshottari',
) => {
  const spanJd = endJd - startJd;
  const unitLength = spanJd / ds.yearSpan;
  const newDepth = depth + 1;
  let prevEnd = startJd;
  const items: Array<Array<any>> = [];
  for (let i = 0; i < ds.length; i++) {
    const nm = ds.matchRow(nakNum, i);
    const start = prevEnd;
    const end = prevEnd + unitLength * nm.years * ds.yearMultiplier;
    prevEnd = end;
    const newNakNum = ((nakNum - 1 + i) % ds.numMatches) + 1;
    items.push([nm.key, start, end, newDepth, newNakNum, system]);
  }
  return items;
};

export class DashaSpan {
  key: string;
  startJd: number;
  endJd: number;
  depth: number;
  nakNum: number;
  system: string;

  constructor(
    ref = null,
    start = 0,
    end = 0,
    depth = 1,
    nakNum = 0,
    system = 'vimshottari',
  ) {
    if (ref instanceof Array && ref.length === 6) {
      const [key, startJd, endJd, depthVal, num, sysVal, dr] = ref;
      if (typeof key === 'string') {
        this.key = key;
      }
      if (typeof startJd === 'number') {
        this.startJd = startJd;
      }
      if (typeof endJd === 'number') {
        this.endJd = endJd;
      }
      if (typeof depthVal === 'number') {
        this.depth = depthVal;
      }
      if (typeof num === 'number') {
        this.nakNum = num;
      }
      if (typeof sysVal === 'string') {
        this.system = sysVal;
      }
    } else if (typeof ref === 'string') {
      this.key = ref;
      this.startJd = start;
      this.endJd = end;
      this.depth = depth;
      this.nakNum = nakNum;
      this.system = system;
    }
  }

  matchRangeRowNakNum(ds: DashaSet, rowIndex: number) {
    let num = 0;
    const row = ds.nakshatraMatches[rowIndex];
    if (row instanceof Object) {
      num = row.from;
    }
    return num;
  }

  children(ds: DashaSet) {
    const rowIndex = ds.nakshatraMatches.findIndex(nm => nm.key === this.key);
    const nakNum =
      ds.mode === 'range'
        ? this.matchRangeRowNakNum(ds, rowIndex)
        : rowIndex + 1;
    return calcDashaSpans(
      ds,
      nakNum,
      this.startJd,
      this.endJd,
      this.depth,
      ds.key,
    )
      .filter(row => row instanceof Array && row.length === 6)
      .map(row => new DashaSpan(row));
  }

  child(ds: DashaSet, index = 0) {
    const children = this.children(ds);
    if (index >= 0 && index < children.length) {
      return children[index];
    }
  }
}

export interface BalanceRef {
  lv1: string;
  lv2: string;
  lv3: string;
  lv4?: string;
}

export const calcTopDashaSpans = (
  ds: DashaSet,
  nakNum: number,
  startJd: number,
  endJd: number,
) => {
  return calcDashaSpans(ds, nakNum, startJd, endJd, 0, ds.key).map(
    row => new DashaSpan(row),
  );
};

export class DashaSet {
  key: string;
  years = 120;
  mode = 'repeat';
  lengthType = 'graha';
  length = 9;
  nakshatraMatches: Array<NakshatraMatch> = [];
  yearScale = 0;

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'key':
          case 'mode':
          case 'lengthType':
            if (typeof value === 'string') {
              this[key] = value;
            }
            break;
          case 'years':
          case 'length':
          case 'yearScale':
            if (typeof value === 'number') {
              this[key] = value;
            }
            break;
          case 'nakshatraMatches':
            if (value instanceof Array) {
              this.nakshatraMatches = value.filter(
                item => item instanceof Object,
              );
            }
            break;
        }
      });
    }
  }

  get numMatches() {
    return this.nakshatraMatches.length;
  }

  get rescaleYears() {
    return (
      this.yearScale > 0 &&
      isNumeric(this.yearScale) &&
      this.years !== this.yearScale
    );
  }

  get yearSpan() {
    return this.rescaleYears ? this.yearScale : this.years;
  }

  get yearMultiplier() {
    return this.rescaleYears ? this.yearScale / this.years : 1;
  }

  lastRowTypeIndex() {
    if (this.numMatches > 0) {
      const lastRow = this.nakshatraMatches.slice(-1)[0];
      return this.nakshatraMatches.findIndex(
        (nm, ni) =>
          ni > this.nakshatraMatches.length / 2 && nm.key === lastRow.key,
      );
    } else {
      return -1;
    }
  }

  nextRow(startIndex = 0, currKey = '') {
    const lastStartTypeIndex = this.lastRowTypeIndex();
    const fromIndex = startIndex >= lastStartTypeIndex ? -1 : startIndex;
    const index = this.nakshatraMatches.findIndex(
      (nm, ni) => ni > fromIndex && nm.key !== currKey,
    );

    let key = '';
    let years = 0;
    if (index >= 0) {
      const matchedRow = this.nakshatraMatches[index];
      key = matchedRow.key;
      years = matchedRow.years * this.yearMultiplier;
    }
    return {
      key,
      years,
      index,
    };
  }

  matchInRange(nm: NakshatraMatch, nakNum: number): boolean {
    return nm.from <= nm.to
      ? nakNum >= nm.from && nakNum <= nm.to
      : (nakNum >= 0 && nakNum <= nm.to) ||
          (nakNum >= nm.from && nakNum <= this.systemNum);
  }

  matchedRangeRowIndex(nakNum: number, offset = 0) {
    let rowIndex = -1;
    if (this.nakshatraMatches.length > 3) {
      const startRowIndex = this.nakshatraMatches.findIndex(nm =>
        this.matchInRange(nm, nakNum),
      );
      rowIndex = (startRowIndex + offset) % this.nakshatraMatches.length;
    }
    return rowIndex;
  }

  calcNak28Range(nakNum = 1) {
    const nakIndex = nakNum - 1;
    const [abStart, abEnd] = abhijitNakshatraRange();
    if (nakNum < 21) {
      return [(360 / 27) * nakIndex, (360 / 27) * nakNum];
    } else if (nakNum === 21) {
      return [(360 / 27) * nakIndex, abStart];
    } else if (nakNum === 22) {
      return [abStart, abEnd];
    } else if (nakNum === 23) {
      return [abEnd, (360 / 27) * nakIndex];
    } else {
      return [(360 / 27) * (nakIndex - 1), (360 / 27) * nakIndex];
    }
  }

  calcNakRange(nakNum = 1) {
    return this.systemNum === 27
      ? this.calcNak27Range(nakNum)
      : this.calcNak28Range(nakNum);
  }

  calcNak27Range(nakNum = 1) {
    return [(nakNum - 1) * (360 / 27), nakNum * (360 / 27)];
  }

  calcRangeProgress(graha: Graha) {
    const rowIndex = this.matchedRangeRowIndex(graha.nakshatra28);
    const row = this.nakshatraMatches[rowIndex];
    let progress = 0;
    if (row instanceof Object) {
      const startDeg = this.calcNak28Range(row.from).shift();
      const endDeg = this.calcNak28Range(row.to).pop();
      const degLength =
        startDeg < endDeg ? endDeg - startDeg : 360 + endDeg - startDeg;
      const firstNakEnd = 360 / 27;
      const endDegProgress = 360 - startDeg;
      const degProgress =
        startDeg < endDeg
          ? graha.longitude - startDeg
          : graha.longitude < firstNakEnd
          ? endDegProgress + firstNakEnd - graha.longitude
          : graha.longitude - startDeg - endDegProgress;
      progress = degProgress / degLength;
    }
    return progress;
  }

  matchRow(nakshatraNum: number, offset = 0): NakshatraMatch {
    const nextOffset = this.mode === 'reverse' ? 0 - offset : offset;

    const index =
      this.mode === 'range'
        ? this.matchedRangeRowIndex(nakshatraNum, nextOffset)
        : nakshatraNum - 1 + nextOffset;
    let match = { key: '', years: 0 };
    const matchIndex = (index + this.numMatches) % this.numMatches;
    if (matchIndex < this.numMatches) {
      if (this.nakshatraMatches[matchIndex] instanceof Object) {
        const { key, years } = this.nakshatraMatches[matchIndex];
        if (notEmptyString(key)) {
          match = { key, years };
        }
      }
    }
    return match;
  }

  get systemNum(): number {
    switch (this.lengthType) {
      case 'nakshatra28':
        return 28;
      default:
        return 27;
    }
  }

  matchYears(nakshatraNum: number): number {
    const row = this.matchRow(nakshatraNum);
    return row.years * this.yearMultiplier;
  }
}

export const fetchDashaSet = (key: string, yearScale = 0): DashaSet => {
  const matchedSet = dashaSets.find(ds => ds.key === key);
  if (matchedSet instanceof Object) {
    return new DashaSet({ ...matchedSet, yearScale });
  } else {
    return new DashaSet();
  }
};

export const calcDashaSetByKey = (
  dashaKey = 'vimshottari',
  graha: Graha,
  jd = 0,
  yearLength = 365.242199,
  yearScale = 0,
): DashaData => {
  const ds = fetchDashaSet(dashaKey, yearScale);
  const nakshatraSystemLength = ds.systemNum;
  const nakNum =
    nakshatraSystemLength === 28 ? graha.nakshatra28 : graha.nakshatra27;
  const dashaYears = ds.matchYears(nakNum);
  const dashaSpanJd = ds.yearSpan * yearLength;
  const spanJd = dashaYears * yearLength;
  const nakFrac =
    nakshatraSystemLength !== 28
      ? nakashatra27Fraction(graha.longitude)
      : ds.mode === 'range'
      ? ds.calcRangeProgress(graha)
      : graha.nakshatra28Progress;
  const startOffset = nakFrac * spanJd;
  const startJd = jd - startOffset;
  const endJd = startJd + dashaSpanJd;
  return {
    dashas: calcTopDashaSpans(ds, nakNum, startJd, endJd),
    set: ds,
    yearLength,
  };
};

export const filterByDashaContraints = (
  sp: DashaSpan,
  targetJd = -1,
  after = false,
  endJd = -1,
) => {
  const hasStart = targetJd > 0;
  const hasRange = hasStart && endJd > 0 && endJd > targetJd;
  const filterDashaAfterStart = (sp: DashaSpan) =>
    (targetJd >= sp.startJd && targetJd <= sp.endJd) ||
    (after && targetJd < sp.startJd);
  const filterDashaBetween = (sp: DashaSpan) =>
    targetJd >= sp.startJd && endJd >= sp.endJd;
  return hasRange
    ? filterDashaBetween(sp)
    : hasStart
    ? filterDashaAfterStart(sp)
    : true;
};

export const mapDashaItem = (
  span: DashaSpan,
  jd = 0,
  dashaSet,
  depth = 0,
  maxDepth = 3,
  tzOffset = 0,
  targetJd = -1,
  hasBalanceKeys = false,
  endJd = -1,
): DashaSpanItem => {
  const children =
    depth < maxDepth
      ? span
          .children(dashaSet)
          .filter(sp =>
            filterByDashaContraints(sp, targetJd, hasBalanceKeys, endJd),
          )
          .map(ds2 =>
            mapDashaItem(
              ds2,
              jd,
              dashaSet,
              depth + 1,
              maxDepth,
              tzOffset,
              targetJd,
              hasBalanceKeys,
              endJd,
            ),
          )
      : [];
  const age = julRangeToAge(span.startJd, jd, tzOffset);
  return {
    ...span,
    children,
    age,
  };
};

export const matchCurrentDashaLord = (
  chart: Chart,
  refJd = 0,
  level = 1,
): DashaSpan => {
  const ds = calcDashaSetByKey('vimshottari', chart.graha('mo'), chart.jd);
  let obj = null;
  if (level === 1) {
    obj = ds.dashas.find(row => refJd >= row.startJd && refJd < row.endJd);
  } else {
    const dashaSpans = ds.dashas
      .filter(row => filterByDashaContraints(row, refJd, false))
      .map(span =>
        mapDashaItem(
          span,
          chart.jd,
          ds.set,
          1,
          2,
          chart.tzOffset,
          refJd,
          false,
        ),
      );
    if (dashaSpans.length > 0) {
      const children = dashaSpans[0].children;
      if (children.length > 0) {
        obj = children[0];
      }
    }
  }
  return obj instanceof Object ? obj : new DashaSpan();
};

export const matchCurrentBhuktiLord = (chart: Chart, refJd = 0) => {
  return matchCurrentDashaLord(chart, refJd, 2);
};

export const mapBalanceSpan = (span: DashaSpanItem, yearLength = 365.25) => {
  const { key, startJd, endJd, age, nakNum } = span;
  const duration = endJd - startJd;
  const endAge = age + duration / yearLength;
  return {
    key,
    startJd,
    endJd,
    start: jdToDateTime(span.startJd),
    end: jdToDateTime(span.endJd),
    age,
    endAge,
    nakNum,
  };
};

export class DashaBalanceItem {
  key = '';
  value = '';
  level = 0;
  constructor(key = '', value = '', level = 0) {
    this.key = key;
    this.value = value;
    this.level = level;
  }

  get apply() {
    return this.value.length > 1;
  }

  matches(key = '') {
    return !this.apply || this.value == key;
  }

  matcheKey(key = '') {
    return this.value == key;
  }
}

export class DashaBalance {
  lv1 = '';
  lv2 = '';
  lv3 = '';
  lv4 = '';

  maxLevel = -1;

  constructor(criteria: Map<string, string> = new Map()) {
    [1, 2, 3, 4]
      .map(num => {
        return { key: `lv${num}`, num };
      })
      .forEach(level => {
        if (criteria.has(level.key)) {
          const keyVal = criteria.get(level.key);
          if ((notEmptyString(keyVal), 1)) {
            this[level.key] = keyVal;
            this.maxLevel = level.num;
          }
        }
      });
  }

  get hasLevel1() {
    return notEmptyString(this.lv1);
  }

  get hasFilters() {
    return this.maxLevel > 0;
  }

  matchBalanceItem(level = 1) {
    const valid = level >= 1 && level <= 4;
    const key = valid ? `lv${level}` : '';
    const value = valid ? this[key] : '';
    return new DashaBalanceItem(key, value, level);
  }
}

export const assignDashaBalances = (
  chart: Chart,
  transitJd = -1,
  maxLevel = 3,
  balanceRef: DashaBalance,
  system = 'vimshottari',
  key = 'mo',
) => {
  const balances = [];
  chart.setAyanamshaItemByNum(27);
  const graha = chart.graha(key);

  const data = calcDashaSetByKey(system, graha, chart.jd);
  if (data.dashas instanceof Array) {
    const dashaSpans = data.dashas
      .filter(row =>
        filterByDashaContraints(row, transitJd, balanceRef.hasFilters),
      )
      .map(span =>
        mapDashaItem(
          span,
          chart.jd,
          data.set,
          1,
          maxLevel,
          chart.tzOffset,
          transitJd,
          balanceRef.hasFilters,
        ),
      );
    if (data.dashas.length > 0) {
      if (balanceRef.hasFilters) {
        const b1 = balanceRef.matchBalanceItem(1);
        let lastMatched = false;
        for (const row of dashaSpans) {
          if (b1.matches(row.key)) {
            if (
              balanceRef.maxLevel === 1 &&
              b1.matcheKey(row.key) &&
              row.startJd > transitJd &&
              !lastMatched
            ) {
              balances.push(mapBalanceSpan(row, data.yearLength));
              lastMatched = true;
            }
            if (row.children.length > 0 && balanceRef.maxLevel >= 2) {
              const b2 = balanceRef.matchBalanceItem(2);
              for (const r2 of row.children) {
                if (
                  balanceRef.maxLevel === 2 &&
                  b2.matcheKey(r2.key) &&
                  r2.startJd > transitJd &&
                  !lastMatched
                ) {
                  balances.push(mapBalanceSpan(row, data.yearLength));
                  balances.push(mapBalanceSpan(r2, data.yearLength));
                  lastMatched = true;
                } else if (b2.matches(r2.key) && balanceRef.maxLevel >= 3) {
                  const b3 = balanceRef.matchBalanceItem(3);
                  for (const r3 of r2.children) {
                    if (
                      balanceRef.maxLevel === 3 &&
                      b3.matcheKey(r3.key) &&
                      r3.startJd > transitJd &&
                      !lastMatched
                    ) {
                      balances.push(mapBalanceSpan(row, data.yearLength));
                      balances.push(mapBalanceSpan(r2, data.yearLength));
                      balances.push(mapBalanceSpan(r3, data.yearLength));
                      lastMatched = true;
                    } else if (b3.matches(r3.key) && balanceRef.maxLevel >= 4) {
                      const b4 = balanceRef.matchBalanceItem(4);
                      for (const r4 of r3.children) {
                        if (
                          balanceRef.maxLevel === 4 &&
                          b4.matcheKey(r4.key) &&
                          r4.startJd > transitJd &&
                          !lastMatched
                        ) {
                          balances.push(mapBalanceSpan(row, data.yearLength));
                          balances.push(mapBalanceSpan(r2, data.yearLength));
                          balances.push(mapBalanceSpan(r3, data.yearLength));
                          balances.push(mapBalanceSpan(r4, data.yearLength));
                          lastMatched = true;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        const first = dashaSpans[0];
        let currSpan = first;
        balances.push(mapBalanceSpan(currSpan, data.yearLength));
        while (currSpan.children.length > 0) {
          currSpan = currSpan.children[0];
          balances.push(mapBalanceSpan(currSpan, data.yearLength));
        }
      }
    }
  }
  return balances;
};

export const calcDashaBalanceNextSub = (
  ds: DashaSet,
  graha: Graha,
  start: DashaDegSpan,
  level = 1,
  targetJd = -1,
) => {
  let progressDeg = 0;
  const totYears =
    start.span
      .children(ds)
      .map(span => {
        const row = ds.matchRow(span.nakNum);
        const { years } = row;
        return years;
      })
      .filter(y => typeof y === 'number')
      .reduce((a, b) => a + b, 0) * ds.yearMultiplier;
  const subs: DashaDegSpan[] = start.span.children(ds).map(span => {
    const row = ds.matchRow(span.nakNum);
    const { years } = row;
    const degSpan = (years / totYears) * (start.endDeg - start.startDeg);
    const startDeg = progressDeg + start.startDeg;
    progressDeg += degSpan;
    const endDeg = progressDeg + start.startDeg;
    const matchJd = targetJd > 0;
    const inRange = matchJd
      ? targetJd >= span.startJd && targetJd <= span.endJd
      : graha.longitude >= startDeg && graha.longitude < endDeg;
    return { span, inRange, years, startDeg, endDeg, level };
  });
  return subs.find(sub => sub.inRange);
};

export const calcTopsDashaBalances = (
  dashaKey = 'vimshottari',
  graha: Graha,
  jd = 0,
  yearLength = 365.242199,
) => {
  const ds = fetchDashaSet(dashaKey);
  const nakshatraSystemLength = ds.systemNum;
  const nakNum =
    nakshatraSystemLength === 28 ? graha.nakshatra28 : graha.nakshatra27;
  const dashaYears = ds.matchYears(nakNum);
  const dashaSpanJd = ds.yearSpan * yearLength;
  const spanJd = dashaYears * yearLength;
  const nakFrac =
    nakshatraSystemLength !== 28
      ? nakashatra27Fraction(graha.longitude)
      : graha.nakshatra28Progress;
  const startOffset = nakFrac * spanJd;
  const startJd = jd - startOffset;
  const endJd = startJd + dashaSpanJd;
  const range = ds.calcNakRange(nakNum);
  const spans = calcTopDashaSpans(ds, nakNum, startJd, endJd);
  return {
    ds,
    spans,
    range,
  };
};

export const calcDashaBalanceByKey = (
  dashaKey = 'vimshottari',
  graha: Graha,
  jd = 0,
  yearLength = 365.242199,
) => {
  const { ds, spans, range } = calcTopsDashaBalances(
    dashaKey,
    graha,
    jd,
    yearLength,
  );

  const span = spans[0];
  const [startDeg, endDeg] = range;

  const lv1 = { span, startDeg, endDeg, inRange: true, level: 1 };

  const lv2 = calcDashaBalanceNextSub(ds, graha, lv1, 2);
  const lv3 = calcDashaBalanceNextSub(ds, graha, lv2, 3);
  const lv4 = calcDashaBalanceNextSub(ds, graha, lv3, 4);
  const lv5 = calcDashaBalanceNextSub(ds, graha, lv4, 5);
  const lv5Length = lv5.endDeg - lv5.startDeg;
  const progress = (lv5.endDeg - graha.longitude) / lv5Length;
  return {
    levels: [lv1, lv2, lv3, lv4, lv5].map(dds => {
      const { key, nakNum, startJd, endJd } = dds.span;
      const { startDeg, endDeg, level } = dds;
      return {
        key,
        nakNum,
        startDeg,
        endDeg,
        startJd,
        endJd,
        level,
      };
    }),
    progress,
    graha,
  };
};

export const nakshatraTrailToOffsets = (
  ds: DashaSet,
  trail: Array<number> = [],
  graha: Graha,
) => {
  const startNakNum =
    ds.systemNum === 27 ? graha.nakshatra27 : graha.nakshatra28;
  return trail.map((n, i) =>
    i < 1 ? ((startNakNum - 1 + n) % ds.systemNum) + 1 : n,
  );
};

export const nakshatraOffsetsToDegree = (ds: DashaSet, offsets: number[]) => {
  const numOffsets = offsets.length;
  let deg = 0;
  const dashaLength = ds.length;
  if (numOffsets > 0) {
    const [start, end] = ds.calcNakRange(offsets[0]);
    deg = start;
    const nakLength = end - start;
    if (numOffsets > 1) {
      for (let i = 1; i < numOffsets; i++) {
        deg += (offsets[i] * nakLength) / Math.pow(dashaLength, i);
      }
    }
  }
  return deg;
};

export const nakshatraTrailToDegree = (
  ds: DashaSet,
  trail: Array<number> = [],
  graha: Graha,
) => {
  const offsets = nakshatraTrailToOffsets(ds, trail, graha);
  return nakshatraOffsetsToDegree(ds, offsets);
};

export const projectedAspects = (chart: Chart) => {
  const excludeKeys = ['ur', 'ne', 'pl'];
  const grahas = [...chart.bodies, chart.ascendantGraha].filter(
    gr => excludeKeys.includes(gr.key) === false,
  );
  const aspectGroup = aspectGroups[0];
  const aspects = grahas
    .map(gr => {
      const targets = aspectGroup
        .map(ag => {
          const targets = [(360 / ag.div) * ag.fac];
          if (targets[0] < 180) {
            targets.push(360 - targets[0]);
          }
          return {
            key: ag.key,
            degrees: targets.map(target => (target + gr.longitude) % 360),
          };
        })
        .filter(tg => tg.degrees.length > 0);
      return {
        key: gr.key,
        targets,
      };
    })
    .filter(asp => asp.targets.some(tg => tg.degrees.length > 0));
  return aspects;
};

export const mapDashaPointAspects = (
  graha: Graha,
  chart: Chart,
  system = 'vimshottari',
  yearLength = 365.25,
  yearScale = 0,
) => {
  const aspects = projectedAspects(chart);
  const { dashas, set } = calcDashaSetByKey(
    system,
    graha,
    chart.jd,
    yearLength,
    yearScale,
  );

  const startNakNum =
    set.systemNum === 27 ? graha.nakshatra27 : graha.nakshatra28;
  const spanDegs = dashas.map((span, index) => {
    const offsets = nakshatraTrailToOffsets(set, [index], graha);
    const startDeg = nakshatraOffsetsToDegree(set, offsets);
    const nakNum = ((startNakNum - 1 + index) % set.systemNum) + 1;
    const row = set.matchRow(nakNum);
    return { span, nakNum, startDeg, days: row.years * yearLength };
  });
  const totalDays = spanDegs.map(sd => sd.days).reduce((a, b) => a + b, 0);
  const lastSpan = spanDegs.slice(-1)[0];
  const lastRange = set.calcNakRange(lastSpan.nakNum);
  const lastIndex = spanDegs.length - 1;
  const spanRanges = spanDegs.map((sd, si) => {
    const endDeg = si < lastIndex ? spanDegs[si + 1].startDeg : lastRange[1];
    const fraction = sd.days / totalDays;
    return { ...sd, endDeg, fraction };
  });
  const aspectMatches = [];
  const sys27 = set.systemNum === 27;
  aspects.forEach(ag => {
    ag.targets.forEach(tg => {
      tg.degrees.forEach(deg => {
        const nakNum = sys27 ? nakshatra27(deg) : nakshatra28(deg);
        const nakProg = sys27
          ? nakshatra27Progress(deg)
          : nakshatra28Progress(deg);

        const matchedRange = spanRanges.find(sr => sr.nakNum === nakNum);
        if (matchedRange instanceof Object) {
          const spanDuration =
            matchedRange.span.endJd - matchedRange.span.startJd;
          const jdProgress = nakProg * spanDuration;
          const targetJd = jdProgress + matchedRange.span.startJd;
          const aspectMatch = {
            degree: deg,
            key: ag.key,
            nakshatra: nakNum,
            system: sys27 ? 27 : 28,
            type: tg.key,
            jd: targetJd,
          };
          aspectMatches.push(aspectMatch);
        }
      });
    });
  });
  aspectMatches.sort((a, b) => (a.jd < b.jd ? -1 : 1));
  return aspectMatches;
};

export const matchDashaSubsetFromChart = (
  chart: Chart,
  transitJd = 0,
  maxLevel = 1,
  durDays = 366,
  key = 'mo',
  system = 'vimshottari',
) => {
  let dashas = [];
  chart.setAyanamshaItemByNum(27);
  const graha = chart.graha(key);
  const scanStartJd = transitJd;
  const scanEndJd = durDays > 0 ? scanStartJd + durDays : -1;
  const nak = graha.nakshatra27;
  const lng = graha.longitude;
  const data = calcDashaSetByKey(system, graha, chart.jd);
  if (data.dashas instanceof Array) {
    dashas = data.dashas
      .filter(
        sp =>
          scanStartJd < 1 ||
          (scanStartJd <= sp.endJd && scanEndJd >= sp.startJd),
      )
      .map(span =>
        mapDashaItem(
          span,
          chart.jd,
          data.set,
          1,
          maxLevel,
          chart.tzOffset,
          scanStartJd,
          false,
          scanEndJd,
        ),
      );
  }
  return { dashas, nak, lng };
};

import { KeyNumValue } from '../../lib/interfaces';
import { smartCastFloat } from '../../lib/converters';
import { inRange, isNumeric, notEmptyString } from '../../lib/validators';
import { matchNakshatra } from './core';
import { calcInclusiveNakshatras, calcInclusiveTwelfths } from './math-funcs';
import { Chart } from './models/chart';
import { Graha } from './models/graha-set';
import { Nakshatra } from './models/nakshatra';
import { Rashi } from './models/rashi-set';
import {
  matchLord,
  matchNaturalGrahaMaitri,
  matchNaturalMaitri,
  matchRelations,
} from './settings/maitri-data';
import rashiValues from './settings/rashi-values';

export const ashtaKeys = [
  'varna',
  'vashya',
  'tara',
  'yoni',
  'grahamaitri',
  'gana',
  'rashi',
  'nadi',
];
export const extraDvadashaKeys = ['rajju', 'vedha', 'stri', 'mahendra'];
export const otherKeys = ['gotra', 'vihanga', 'yonyanukulya', 'vainashika'];
export const dashaKeys = [
  'vashya/dasha',
  'tara',
  'yoni',
  'grahamaitri',
  'gana/dasha',
  'rashi',
  'rajju/dasha',
  'vedha',
  'mahendra',
  'stri',
];
export const saptaKeys = [
  'varna/scale/5',
  'vashya',
  'tara/scale/6',
  'yoni',
  'grahamaitri/sapta',
  'gana/sapta',
  'rashi/scale/8',
];

export const dvadashaKeys = [...ashtaKeys, ...extraDvadashaKeys];

export const dashaAshtaDvadashaKeys = () => {
  const coreKeys = [...dvadashaKeys];
  const extraDashaKeys = dashaKeys.filter(
    dk => coreKeys.includes(dk) === false,
  );
  return [...coreKeys, ...extraDashaKeys];
};

export const dashaAshtaKeys = () => {
  const comboKeys = [...ashtaKeys];
  const extraDashaKeys = dashaKeys.filter(
    dk => comboKeys.includes(dk) === false,
  );
  return [...comboKeys, ...extraDashaKeys];
};

export const dashaSaptaAshtaDvadashaKeys = () => {
  const comboKeys = [...dvadashaKeys];
  const extraDashaKeys = [...dashaKeys, ...saptaKeys].filter(
    dk => comboKeys.includes(dk) === false,
  );
  return [...comboKeys, ...extraDashaKeys];
};

export const allObjectKeys = [...ashtaKeys, ...extraDvadashaKeys, ...otherKeys];

export const matchKutaKeyVariants = (kutaType = 'ashta') => {
  const kutaRef = kutaType.toLowerCase();
  switch (kutaRef) {
    case 'dvadasha':
      return dvadashaKeys;
    case 'dasha':
      return dashaKeys;
    case 'sapta':
      return saptaKeys;
    case 'other':
      return otherKeys;
    case 'dashaashta':
      return dashaAshtaKeys();
    case 'dashaashtadvadasha':
      return dashaAshtaDvadashaKeys();
    case 'dashasaptadvadasha':
      return dashaSaptaAshtaDvadashaKeys();
    case 'all':
      return allObjectKeys;
    default:
      return ashtaKeys;
  }
};

export const showKutaVariants = () => {
  return [
    'sapta',
    'ashta',
    'dasha',
    'dvadasha',
    'other',
    'dashaashta',
    'dashaashtadvadasha',
    'all',
  ].map(type => {
    return {
      type,
      keys: matchKutaKeyVariants(type),
    };
  });
};

export interface MfScores {
  fm: number;
  mf: number;
  sameSign?: number;
}

export interface SignMatchProtocol {
  signMatches: Array<number[]>;
  scores: MfScores;
}

export interface VashyaDegreeRange {
  degreeRange: Array<number>;
  vashya: number;
}

export interface RangeMatchProtocol {
  ranges: Array<VashyaDegreeRange>;
  score: any;
}
export interface DictMatch {
  key: string;
  dict: string;
}

export interface ItemMatchOverride {
  num: number;
  index: number;
  score: number;
}

export interface KutaScoreMatch {
  standard: number;
  match: number;
  overrides?: Array<ItemMatchOverride>;
}

export class KutaValueSet {
  key = '';
  title = '';
  head = '';
  c1Value = '-';
  c2Value = '-';
  score = 0;
  max = 0;
  variantRef = '';

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'key':
          case 'head':
          case 'c1Value':
          case 'c2Value':
          case 'variantRef':
          case 'title':
            if (typeof v === 'string') {
              this[k] = v;
            }
            break;
          case 'score':
          case 'max':
            if (typeof v === 'number') {
              this[k] = v;
            }
            break;
        }
      });
    }
  }

  get variantKey(): string {
    const parts = [this.key];
    if (notEmptyString(this.variantRef) && this.variantRef !== 'standard') {
      parts.push(this.variantRef);
    }
    return parts.join('/');
  }
}

export interface KutaVSet {
  key?:	string;
  title: string;
  c1Value:	string;
  c2Value: string;
  score: number;
  max: number;
}

export interface KutaValueSetItems {
  k1: string;
  k2: string;
  values: KutaValueSet[];
}

export interface KutaVSetItems {
  k1: string;
  k2: string;
  values: KutaVSet[];
}

export interface KutaValueSetValues {
  k1: string;
  k2: string;
  values: KeyNumValue[];
}

class KutaKeyVariant {
  key = '';
  variant = '';
  scale = -1;

  constructor(keyRef = '') {
    if (typeof keyRef === 'string') {
      const parts = keyRef.split('/');
      this.key = parts[0];
      if (parts.length > 1) {
        const isScale = parts[1] === 'scale';
        if (!isScale) {
          this.variant = parts[1];
        } else {
          if (parts.length > 2 && isNumeric(parts[2])) {
            this.scale = smartCastFloat(parts[2]);
          }
        }
      }
    }
  }

  get hasVariant() {
    return this.variant.length > 1;
  }

  get hasScale() {
    return this.scale > 0;
  }

  get variantRef() {
    return this.hasScale
      ? ['scale', this.scale].join('/')
      : this.hasVariant
      ? this.variant
      : 'standard';
  }
}

export interface KeyKeys {
  key: string;
  keys: Array<string>;
}

export interface KutaCell {
  key: string;
  head?: string;
  grahaKey: string;
  c1Value?: string;
  c2Value?: string;
  score: number;
  max?: number;
}

export class KutaMultiSet {
  key = '';
  head = '';
  cells: Array<KutaCell> = [];

  constructor(key: string, head: string, cells: Array<KutaCell>) {
    this.key = key;
    this.head = head;
    if (cells.length > 0) {
      this.cells = cells;
    }
  }

  get total() {
    return this.cells.map(c => c.score).reduce((a, b) => a + b, 0);
  }

  get max() {
    return this.cells.map(c => c.max).reduce((a, b) => a + b, 0);
  }
}

export class KutaGrahaItem {
  key: string;
  gender: string;
  rashi: Rashi;
  nakshatra: Nakshatra;
  nakshatra28Num?: number;
  lng: number;
  moonWaxing: boolean;

  constructor(graha: Graha, gender: string, moonWaxing: boolean) {
    this.key = graha.key;
    this.gender = gender;
    const rashi = rashiValues.find(rs => rs.num === graha.sign);
    if (rashi instanceof Object) {
      this.rashi = new Rashi(rashi);
    }
    if (graha.nakshatra instanceof Object) {
      this.nakshatra = graha.nakshatra;
    }
    this.lng = graha.longitude;
    this.nakshatra28Num = graha.nakshatra28;
    this.moonWaxing = moonWaxing;
  }

  get nakshatraNum(): number {
    return this.nakshatra.num;
  }
  get nakshatraIndex(): number {
    return this.nakshatra.num - 1;
  }

  get sign(): number {
    return this.rashi.num;
  }

  get signIndex(): number {
    return this.rashi.num - 1;
  }
}

export class Kuta {
  vargaNum = 1;
  switching = false;
  c1: Chart;
  c2: Chart;
  /* private g1: Map<string, Graha> = new Map();
  private g2: Map<string, Graha> = new Map();

  private c2Key = 'mo';

  private c1Key = 'mo'; */

  private kutaType = 'all';

  private itemOptions = new Map<string, string>();

  private pairKeys = ['as', 'mo', 've', 'su'];

  private compatabilitySet = new Map<string, any>();

  private valueSets = new Map<string, KutaValueSet>();

  private singleValues: Array<KutaValueSet> = [];

  private multiSets = new Map<string, KutaMultiSet>();

  private multiValues: Array<KutaMultiSet> = [];

  private gender1 = 'f';
  private gender2 = 'm';

  constructor(chart1: Chart, chart2: Chart) {
    this.c1 = chart1;
    this.c2 = chart2;
  }

  get coreBodies() {
    return ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa'];
  }

  get extraObjects() {
    return ['as', 'ds'];
  }
  get activePairKeys() {
    return this.allKeys.filter(k => this.pairKeys.includes(k));
  }

  get itemVariants(): Array<KeyKeys> {
    const itemVars: Array<KeyKeys> = [];
    for (const [key, value] of this.compatabilitySet.entries()) {
      if (value instanceof Object) {
        const { variants } = value;
        if (variants instanceof Object) {
          const keys = Object.keys(variants);
          if (keys.length > 0) {
            itemVars.push({ key, keys });
          }
        }
      }
    }
    return itemVars;
  }

  get types() {
    return ['ashta', 'dvadasha', 'dasha', 'other'];
  }

  get allKeys() {
    return [...this.coreBodies, ...this.extraObjects];
  }

  loadCompatibility(
    kutaSet: Map<string, any> = new Map(),
    overrideOptions: Map<string, string> = new Map(),
  ) {
    this.compatabilitySet = kutaSet;
    this.itemVariants
      .filter(iv => iv.keys.length > 0)
      .forEach(iv => {
        const hasOverride = overrideOptions.has(iv.key);
        const overrideKey = hasOverride ? overrideOptions.get(iv.key) : '';
        const overrideExists = hasOverride
          ? iv.keys.includes(overrideKey)
          : false;
        const matchedOptKey = overrideExists ? overrideKey : iv.keys[0];
        this.itemOptions.set(iv.key, matchedOptKey);
      });
  }

  calcTotalRow(refValues: Array<any>) {
    const total = refValues
      .filter(sv => sv instanceof KutaValueSet || sv instanceof KutaMultiSet)
      .map(sv => sv.score)
      .reduce((a, b) => a + b, 0);
    const maxTotal = refValues
      .filter(sv => typeof sv.max === 'number')
      .map(sv => sv.max)
      .reduce((a, b) => a + b, 0);
    return {
      score: total,
      max: maxTotal,
    };
  }

  buildSingleValues(addTotal = false) {
    this.singleValues = this.currentKeys.map(keyRef => {
      //const key = keyRef.split('/').shift();
      const row = this.valueSets.get(keyRef);
      const result = row instanceof KutaValueSet ? row : new KutaValueSet(null);
      return result;
    });
    if (addTotal) {
      const { score, max } = this.calcTotalRow(this.singleValues);
      const totalRow = new KutaValueSet({
        key: 'total',
        head: 'Total',
        score,
        max,
      });
      this.singleValues.push(totalRow);
    }
    return this.singleValues;
  }

  get currentKeys() {
    return matchKutaKeyVariants(this.kutaType);
  }

  /* buildMultiValues() {
    this.multiValues = this.currentKeys.map(key => {
      const row = this.multiSets.get(key);
      const result =
        row instanceof KutaMultiSet ? row : new KutaMultiSet('', '', []);
      return result;
    });
    const totals = new Map<string, number[]>();
    this.multiValues.forEach(mv => {
      mv.cells.forEach(cell => {
        if (totals.has(cell.grahaKey)) {
          const [score, max] = totals.get(cell.grahaKey);
          totals.set(cell.grahaKey, [score + cell.score, max + cell.max]);
        } else {
          totals.set(cell.grahaKey, [cell.score, cell.max]);
        }
      });
    });
    const totalCells = Object.entries(Object.fromEntries(totals)).map(entry => {
      const [grahaKey, pair] = entry;
      const [score, max] = pair;
      return {
        key: 'subtotal',
        grahaKey,
        score,
        max,
      };
    });

    const totalRow = new KutaMultiSet('total', 'Total', totalCells);
    this.multiValues.push(totalRow);
  } */

  /*   matchRowLabel(field: string, singleMode = true) {
    const refCols = singleMode ? this.singleColumns : this.multiColumns;
    const col = refCols.find(col => col.key === field);
    if (col instanceof Object) {
      return col.label;
    }
  } */

  /* get singleColumns() {
    const cols = [
      {
        key: 'head',
        label: 'Kuta',
      },
    ];
    cols.push({
      key: 'c1',
      label: this.gender1,
    });
    cols.push({
      key: 'c2',
      label: this.gender2,
    });
    cols.push({
      key: 'score',
      label: 'Score',
    });
    cols.push({
      key: 'max',
      label: 'Max',
    });
    return cols;
  } */

  /* get multiColumns() {
    const cols = [
      {
        key: 'head',
        label: 'Kuta',
      },
    ];
    this.activePairKeys.forEach(gk => {
      cols.push({
        key: gk,
        label: gk,
      });
    });
    cols.push({
      key: 'total',
      label: 'Total',
    });
    cols.push({
      key: 'max',
      label: 'Max',
    });
    return cols;
  } */

  /* buildGrahas(set = 1): Array<Graha> {
    const c = set === 2 ? this.c2 : this.c1;
    const grahas = [
      ...c.bodies.filter(gr => this.coreBodies.includes(gr.key)),
      c.ascendantGraha,
      c.descendantGraha,
    ];
    return grahas;
  } */

  calcAllSingleKutasFull(grahaKeys: string[] = [], allCombos = true): KutaValueSetItems[] {
    const items = [];
    const refKeys = grahaKeys.length > 1 ? grahaKeys : this.allKeys;
    refKeys.forEach(k1 => {
      const innerRefKeys = allCombos ? refKeys : [k1];
      innerRefKeys.forEach(k2 => {
        items.push({
          k1,
          k2,
          values: this.calcSingleKutas(this.c1.graha(k1), this.c2.graha(k2)),
        });
      });
    });
    return items;
  }

  calcAllSingleKutas(
    fullSet = false,
    grahaKeys: string[] = [],
    kutaType = 'all',
    allCombos = true,
  ): KutaValueSetItems[] | KutaValueSetValues[] {
    this.kutaType = kutaType;
    const items = this.calcAllSingleKutasFull(grahaKeys, allCombos);
    const simplifyKuta = (item: KutaValueSet) => {
      return {
        key: item.key,
        value: item.score,
      };
    };
    return fullSet
      ? items
      : items.map(row => {
          const { k1, k2, values } = row;
          return {
            k1,
            k2,
            values: values.map(simplifyKuta),
          };
        });
  }

  calcAllSingleFullKutas( grahaKeys: string[] = [], kutaType = 'all', allCombos = true): KutaValueSetItems[] {
    return this.calcAllSingleKutas(true,grahaKeys,kutaType,allCombos) as KutaValueSetItems[];
  }

  calcSingleKutasAsObj(gr1: Graha, gr2: Graha) {
    const values = this.calcSingleKutas(gr1, gr2);
    const mp: Map<string, number> = new Map();
    values.forEach(item => {
      mp.set(item.key, item.score);
    });
    return Object.fromEntries(mp.entries());
  }

  calcSingleKutas(gr1: Graha, gr2: Graha) {
    this.valueSets = new Map<string, KutaValueSet>();
    if (gr1 instanceof Graha && gr2 instanceof Graha) {
      const { s1, s2, valid } = this.buildSubjects(gr1, gr2);
      if (valid) {
        this.currentKeys.forEach(keyRef => {
          const {
            key,
            variant,
            hasVariant,
            scale,
            variantRef,
          } = new KutaKeyVariant(keyRef);
          if (hasVariant) {
            this.itemOptions.set(key, variant);
          } else {
            this.itemOptions.set(key, this.getDefaultVariant(key));
          }
          const result = this.calcItem(key, [s1, s2], scale, variantRef);
          this.valueSets.set(keyRef, result);
        });
      }
    }
    return this.buildSingleValues();
  }

  calcSingleKuta(key = '', gr1: Graha, gr2: Graha) {
    let result: any = null;
    if (gr1 instanceof Graha && gr2 instanceof Graha && notEmptyString(key)) {
      const { s1, s2, valid } = this.buildSubjects(gr1, gr2);
      if (valid) {
        result = this.calcItem(key, [s1, s2]);
      }
    }
    return result;
  }

  buildSubjects(gr1: Graha, gr2: Graha) {
    let s1 = null;
    let s2 = null;
    if (gr1 instanceof Graha && gr2 instanceof Graha) {
      s1 = new KutaGrahaItem(gr1, this.gender1, false);
      s2 = new KutaGrahaItem(gr2, this.gender2, true);
    }
    return {
      s1,
      s2,
      valid: s1 instanceof KutaGrahaItem && s2 instanceof KutaGrahaItem,
    };
  }

  /*  calcMultiKutas() {
    if (this.activePairKeys.length > 0) {
      this.multiSets = new Map<string, KutaMultiSet>();
      this.activePairKeys.forEach(gk => {
        const gr1 = this.matchGraha(this.c1, gk);
        const gr2 = this.matchGraha(this.c2, gk);
        if (gr1 instanceof Graha && gr2 instanceof Graha) {
          const { s1, s2, valid } = this.buildSubjects(gr1, gr2);
          if (valid) {
            this.currentKeys.forEach(key => {
              const item = this.calcItem(key, [s1, s2]);
              const cell = { ...item, grahaKey: gk };
              if (this.multiSets.has(key)) {
                const refRow = this.multiSets.get(key);
                refRow.cells.push(cell);
                this.multiSets.set(key, refRow);
              } else {
                this.multiSets.set(
                  key,
                  new KutaMultiSet(key, item.head, [cell]),
                );
              }
            });
          }
        }
      });
      this.buildMultiValues();
    }
  } */

  getDefaultVariant(key = '') {
    const settings = this.compatabilitySet.get(key);
    if (settings instanceof Object) {
      const { variants } = settings;
      if (variants instanceof Object) {
        const keys = Object.keys(variants);
        if (keys.length) {
          return keys[0];
        }
      }
    }
    return '-';
  }

  calcItem(
    key: string,
    dataSets: Array<KutaGrahaItem>,
    scale = -1,
    variantRef = '',
  ): KutaValueSet {
    const result = new KutaValueSet({ key });
    if (this.compatabilitySet.has(key) && dataSets.length > 1) {
      const settings = this.compatabilitySet.get(key);
      if (settings instanceof Object) {
        const femaleIndex = dataSets.findIndex(ds => ds.gender === 'f');
        const maleIndex = dataSets.findIndex(ds => ds.gender === 'm');
        //const hasMale = maleIndex >= 0;
        const hasFemale = femaleIndex >= 0;
        const femaleFirst = hasFemale && femaleIndex < maleIndex;
        /* const female = hasFemale ? dataSets[femaleIndex] : null;
        const male = hasMale ? dataSets[maleIndex] : null; */
        if (settings.matchType) {
          switch (key) {
            case 'varna':
              this._calcVarna(settings, result, dataSets, femaleFirst);
              break;
            case 'rashi':
              this._calcRashi(settings, result, dataSets);
              break;
            case 'vashya':
              this._calcVashya(settings, result, dataSets, femaleFirst);
              break;
            case 'grahamaitri':
              this._calcGrahamaitri(settings, result, dataSets, femaleFirst);
              break;
            case 'tara':
              this._calcTara(settings, result, dataSets);
              break;
            case 'nadi':
              this._calcNadi(settings, result, dataSets);
              break;
            case 'yoni':
              this._calcYoni(settings, result, dataSets);
              break;
            case 'gana':
              this._calcGana(settings, result, dataSets);
              break;
            case 'mahendra':
              this._calcMahendra(settings, result, dataSets, femaleFirst);
              break;
            case 'vedha':
              this._calcVedha(settings, result, dataSets, femaleFirst);
              break;
            case 'rajju':
              this._calcRajju(settings, result, dataSets);
              break;
            case 'stri':
              this._calcStri(settings, result, dataSets, femaleFirst);
              break;
            case 'vainashika':
              this._calcVainashika(settings, result, dataSets, femaleFirst);
              break;
            case 'yonyanukulya':
              this._calcYonyanukulya(settings, result, dataSets, femaleFirst);
              break;
            case 'vihanga':
              this._calcVihanga(settings, result, dataSets, femaleFirst);
              break;
            case 'gotra':
              this._calcGotra(settings, result, dataSets);
              break;
          }
        }
        if (result.max < 1 && isNumeric(settings.max)) {
          result.max = settings.max;
        }
        if (scale > 0 && typeof result.max === 'number') {
          result.score = (result.score / result.max) * scale;
          result.max = scale;
        }
        if (result.c1Value.length < 2 && dataSets.length > 0) {
          const diff1 = calcInclusiveNakshatras(
            dataSets[0].nakshatraNum,
            dataSets[1].nakshatraNum,
          );
          result.c1Value = ['nakshatra', dataSets[0].nakshatraNum, diff1].join(
            '/',
          );
        }
        if (result.c2Value.length < 2 && dataSets.length > 1) {
          const diff2 = calcInclusiveNakshatras(
            dataSets[1].nakshatraNum,
            dataSets[0].nakshatraNum,
          );
          result.c2Value = ['nakshatra', dataSets[1].nakshatraNum, diff2].join(
            '/',
          );
        }
        result.head = dataSets.map(ds => [ds.key, ds.lng].join(':')).join('/');
        result.variantRef = variantRef;
      }
    }
    return result;
  }

  _calcVarna(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst = true,
  ) {
    const key = 'varna';
    let score = 0;
    const [s1, s2] = dataSets;
    const female = femaleFirst ? s1 : s2;
    const male = femaleFirst ? s2 : s1;
    const femaleVal = settings.signs.find(sn => sn.sign === female.rashi.num);
    const scoreSet = settings.score.find(sc => sc.brideNum === femaleVal.num);
    const maleVal = settings.signs.find(sn => sn.sign === male.rashi.num);
    const maleScoreIndex = maleVal.num - 1;
    const s1Num = femaleFirst ? femaleVal.num : maleVal.num;
    const s2Num = femaleFirst ? maleVal.num : femaleVal.num;
    score = scoreSet.groomScores[maleScoreIndex];
    result.c1Value = [key, s1Num].join('/');
    result.c2Value = [key, s2Num].join('/');
    result.score = score;
  }

  _calcRashi(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const { signDifferences } = settings;
    const [s1, s2] = dataSets;
    const diffOneIndex = calcInclusiveTwelfths(s1.rashi.num, s2.rashi.num) - 1;
    const diffTwoIndex = calcInclusiveTwelfths(s2.rashi.num, s1.rashi.num) - 1;
    const score1 = signDifferences[diffOneIndex];
    const score2 = signDifferences[diffTwoIndex];
    result.c1Value = ['sign', s1.rashi.num, score1].join('/');
    result.c2Value = ['sign', s2.rashi.num, score2].join('/');
    result.score = (score1 + score2) / 2;
  }

  _calcTara(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const [s1, s2] = dataSets;
    const taraValOne = calcInclusiveNakshatras(
      s1.nakshatraNum,
      s2.nakshatraNum,
    );
    const taraValTwo = calcInclusiveNakshatras(
      s2.nakshatraNum,
      s1.nakshatraNum,
    );
    const numTaras = 9;
    const taraMod1 = taraValOne % numTaras;
    const taraMod2 = taraValTwo % numTaras;
    const taraNum1 = taraMod1 === 0 ? numTaras : taraMod1;
    const taraNum2 = taraMod2 === 0 ? numTaras : taraMod2;
    const taraIndex1 = taraNum1 - 1;
    const taraIndex2 = taraNum2 - 1;

    const { scores } = settings;
    if (scores instanceof Array && scores.length > 8) {
      result.c1Value = ['tara', taraNum1, taraValOne].join('/');
      result.c2Value = ['tara', taraNum2, taraValTwo].join('/');
      result.score = scores[taraIndex1] + scores[taraIndex2];
    }
  }

  _calcNadi(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const [s1, s2] = dataSets;
    const { values, groups, calc } = settings;
    if (
      values instanceof Array &&
      values.length > 26 &&
      groups instanceof Array
    ) {
      const nadiOne = values[s1.nakshatraNum - 1];
      const nadiTwo = values[s2.nakshatraNum - 1];
      const same = nadiOne === nadiTwo;
      const comparisonType = same ? 'same' : 'different';
      if (calc instanceof Array && calc.length > 0) {
        const calcItem = calc
          .filter(row => row instanceof Object)
          .find(
            row =>
              row.mode === 'value' &&
              row.action === 'score' &&
              row.compare === comparisonType,
          );
        if (calcItem) {
          const nadiOne = values[s1.nakshatraNum - 1];
          const nadiTwo = values[s2.nakshatraNum - 1];
          result.c1Value = ['nadi', [1, nadiOne].join('_')].join('/');
          result.c2Value = ['nadi', [1, nadiTwo].join('_')].join('/');
          result.score = calcItem.score;
        }
      }
    }
  }

  _calcYoni(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const { nakshatraMatches, matchScores, calc } = settings;
    if (
      nakshatraMatches instanceof Array &&
      matchScores instanceof Object &&
      calc instanceof Array
    ) {
      const [s1, s2] = dataSets;
      let score = 0;
      if (s1.nakshatraIndex < nakshatraMatches.length) {
        const yoniOne = nakshatraMatches[s1.nakshatraIndex];
        const yoniTwo = nakshatraMatches[s2.nakshatraIndex];
        const yoniIndex1 = yoniOne.yoni - 1;
        const yoniIndex2 = yoniTwo.yoni - 1;
        const defProtocol = this.itemOptions.get('yoni');
        const scoreSet = matchScores[defProtocol];
        if (
          scoreSet instanceof Array &&
          yoniIndex1 < 14 &&
          yoniIndex2 < 14 &&
          yoniIndex1 >= 0 &&
          yoniIndex2 >= 0 &&
          scoreSet.length > 13
        ) {
          score = scoreSet[yoniIndex1][yoniIndex2];
          const matchesGender1 = s1.gender === yoniOne.gender;
          const matchesGender2 = s2.gender === yoniTwo.gender;
          if (s1.gender !== s2.gender) {
            const femaleMatches =
              s1.gender === 'f' ? matchesGender1 : matchesGender2;
            const maleMatches =
              s1.gender === 'm' ? matchesGender1 : matchesGender2;
            const matchCondition = {
              f: maleMatches,
              m: femaleMatches,
            };
            const calcItem = calc.find(ci =>
              ci.matches.some(
                m => m.f === matchCondition.f && m.m === matchCondition.m,
              ),
            );
            if (calcItem) {
              if (calcItem.action === 'add') {
                score += calcItem.add;
              }
            }
          }
        }
        result.c1Value = ['yoni', matchNakshatra(dataSets[0].lng).yoni].join(
          '/',
        );
        result.c2Value = ['yoni', matchNakshatra(dataSets[1].lng).yoni].join(
          '/',
        );
        result.score = score;
      }
    }
  }

  _calcGana(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const { nakshatraMatches, matchScores, max, calc } = settings;

    if (
      nakshatraMatches instanceof Array &&
      matchScores instanceof Object &&
      calc instanceof Array
    ) {
      const [s1, s2] = dataSets;
      let score = 0;
      if (s1.nakshatraIndex < nakshatraMatches.length) {
        const ganaOne = nakshatraMatches[s1.nakshatraIndex];
        const ganaTwo = nakshatraMatches[s2.nakshatraIndex];
        const ganaIndex1 = ganaOne - 1;
        const ganaIndex2 = ganaTwo - 1;
        const protocolKey = this.itemOptions.get('gana');
        const scoreKeys = Object.keys(matchScores);
        if (protocolKey && scoreKeys.includes(protocolKey)) {
          const scoreSet = matchScores[protocolKey];
          if (
            ganaIndex1 < 3 &&
            ganaIndex2 < 3 &&
            ganaIndex1 >= 0 &&
            ganaIndex2 >= 0 &&
            scoreSet.length > 2
          ) {
            score = scoreSet[ganaIndex1][ganaIndex2];
            if (s1.gender !== s2.gender) {
              const femaleGana = s1.gender === 'f' ? ganaOne : ganaTwo;
              const maleGana = s1.gender === 'm' ? ganaOne : ganaTwo;
              const calcItem = calc.find(
                ci => ci.f === femaleGana && ci.m === maleGana,
              );
              if (calcItem) {
                if (calcItem.action === 'add') {
                  score += calcItem.add;
                }
              }
            }
            result.c1Value = ['gana', ganaOne].join('/');
            result.c2Value = ['gana', ganaTwo].join('/');
          }
        }
        if (max instanceof Object) {
          if (Object.keys(max).includes(protocolKey)) {
            result.max = max[protocolKey];
          }
        }
        result.score = score;
      }
    }
  }

  _applyVashyaDefouwScore(
    protocol: SignMatchProtocol,
    signIndex: number,
    otherSignNum: number,
    isFemale: boolean,
  ) {
    const { signMatches, scores } = protocol;
    let score = 0;
    const signRow = signMatches[signIndex];

    if (signRow instanceof Array) {
      const hasScore = signRow.includes(otherSignNum);
      if (hasScore) {
        score = isFemale ? scores.fm : scores.mf;
      }
    }
    return score;
  }

  _applyClassicVashyaRangeMatch(
    protocol: RangeMatchProtocol,
    subject: KutaGrahaItem,
  ): VashyaDegreeRange {
    return protocol.ranges.find(dr => {
      let valid = false;
      if (dr.degreeRange instanceof Array) {
        const [min, max] = dr.degreeRange;
        valid = subject.lng >= min && subject.lng < max;
      }
      return valid;
    });
  }

  _calcVashya(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst,
  ) {
    let score = 0;
    const { signMatches } = settings;
    const [s1, s2] = dataSets;
    const signIndex1 = s1.rashi.num - 1;
    const signIndex2 = s2.rashi.num - 1;
    // const sameSign = s1.rashi.num === s2.rashi.num;
    let defProtocol = this.itemOptions.get('vashya');
    if (!defProtocol) {
      defProtocol = 'classical__one';
      score += 1 - 1;
    }
    let vashya1 = 0;
    let vashya2 = 0;
    const [protocolKey, protocolSubKey] = defProtocol.split('__');
    if (signMatches instanceof Object) {
      const protocols = Object.keys(signMatches);
      if (protocols.includes(protocolKey)) {
        const protocol = signMatches[protocolKey];
        const { matchType, max } = protocol;
        if (max) {
          result.max = max;
        }
        if (matchType === 'signMatches') {
          score = this._applyVashyaDefouwScore(
            protocol,
            signIndex1,
            s2.rashi.num,
            femaleFirst,
          );
          const score2 = this._applyVashyaDefouwScore(
            protocol,
            signIndex2,
            s1.rashi.num,
            !femaleFirst,
          );
          // Divide by 2 if vashya is matched both ways
          if (score > 0 && score2 > 0) {
            score = (score + score2) / 2;
          } else if (score2 > 0) {
            score += score2;
          }
        } else if (matchType === 'degreeRange') {
          const female = femaleFirst ? s1 : s2;
          const male = femaleFirst ? s2 : s1;
          const v1 = this._applyClassicVashyaRangeMatch(protocol, female);
          const v2 = this._applyClassicVashyaRangeMatch(protocol, male);
          if (protocol.score instanceof Object) {
            /* const scoreKeys = Object.keys(protocol.score); */
            const scoreRows = protocol.score[protocolSubKey];
            const vashyaIndex1 = v1.vashya - 1;
            const vashyaIndex2 = v2.vashya - 1;
            vashya1 = femaleFirst ? v1.vashya : v2.vashya;
            vashya2 = femaleFirst ? v2.vashya : v1.vashya;
            if (vashyaIndex1 < scoreRows.length) {
              score = scoreRows[vashyaIndex1][vashyaIndex2];
            }
          }
        }
        result.c1Value = ['vashya', vashya1].join('/');
        result.c2Value = ['vashya', vashya2].join('/');
        result.score = score;
      }
    }
  }

  _calcGrahamaitri(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst = true,
  ) {
    const [s1, s2] = dataSets;
    const [rel1, rel2] = matchNaturalGrahaMaitri(s1, s2);
    const protocolKey = this.itemOptions.get('grahamaitri');
    const { max } = settings;
    const variantKeys = Object.keys(settings);
    if (protocolKey && variantKeys.includes(protocolKey)) {
      const femaleRel = femaleFirst ? rel1 : rel2;
      const maleRel = femaleFirst ? rel2 : rel1;
      const relMatch = { f: femaleRel, m: maleRel };
      const scores = settings[protocolKey];
      if (scores instanceof Array) {
        const scoreItem = scores.find(
          sc => sc.f === relMatch.f && sc.m === relMatch.m,
        );
        const { dignities } = settings.dictionary;
        result.c1Value = this.diginityKey(dignities, rel1);
        result.c2Value = this.diginityKey(dignities, rel2);
        if (scoreItem) {
          result.score = scoreItem.score;
        }
      }
      if (max instanceof Object) {
        if (Object.keys(max).includes(protocolKey)) {
          result.max = smartCastFloat(max[protocolKey]);
        }
      }
    }
  }

  _calcMahendra(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst = true,
  ) {
    const [s1, s2] = dataSets;
    const female = femaleFirst ? s1 : s2;
    const male = femaleFirst ? s2 : s1;
    const { fmMatches } = settings;
    if (fmMatches instanceof Array) {
      if (fmMatches.length > 26 && female.nakshatraIndex < fmMatches.length) {
        const matchedRow = fmMatches[female.nakshatraIndex];
        const hasMatch = matchedRow.includes(male.nakshatraNum);
        if (hasMatch) {
          const protocolKey = this.itemOptions.get('mahendra');
          if (notEmptyString(protocolKey)) {
            const keys = Object.keys(settings);
            if (
              keys.includes(protocolKey) &&
              settings[protocolKey] instanceof Object
            ) {
              const { score, max } = settings[protocolKey];
              if (score) {
                result.score = score.match;
                result.max = max;
              }
            }
          }
        }
      }
    }
  }

  _calcVedhaSubScore(score: KutaScoreMatch, matchIndex = 0, nakshatraNum = 0) {
    let scoreVal = 0;
    const { match, standard, overrides } = score;
    if (matchIndex >= 0) {
      scoreVal = match;
      if (overrides instanceof Array) {
        const override = overrides.find(
          ov => ov.num === nakshatraNum && matchIndex === ov.index,
        );
        if (override) {
          scoreVal = override.score;
        }
      }
    } else {
      scoreVal = standard;
    }
    return scoreVal;
  }

  _calcVedha(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst = true,
  ) {
    const [s1, s2] = dataSets;
    const { matches } = settings;
    if (matches instanceof Array) {
      if (matches.length > 26 && s1.nakshatraIndex < matches.length) {
        const matchedRow1 = matches[s1.nakshatraIndex];
        const matchIndex1 = matchedRow1.indexOf(s2.nakshatraNum);
        const matchedRow2 = matches[s2.nakshatraIndex];
        const matchIndex2 = matchedRow2.indexOf(s1.nakshatraNum);
        const protocolKey = this.itemOptions.get('vedha');

        if (notEmptyString(protocolKey)) {
          const keys = Object.keys(settings);
          if (
            keys.includes(protocolKey) &&
            settings[protocolKey] instanceof Object
          ) {
            const { score, max } = settings[protocolKey];
            if (score) {
              let scoreVal = this._calcVedhaSubScore(
                score,
                matchIndex1,
                s1.nakshatraNum,
              );
              scoreVal += this._calcVedhaSubScore(
                score,
                matchIndex2,
                s2.nakshatraNum,
              );
              result.c1Value = ['nakshatra', s1.nakshatraNum].join('/');
              result.c2Value = ['nakshatra', s2.nakshatraNum].join('/');
              result.score = scoreVal / 2;
              result.max = max;
            }
          }
        }
      }
    }
  }

  _calcRajju(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const [s1, s2] = dataSets;
    const { values } = settings;
    let itemScore = 0;
    if (values instanceof Array) {
      if (values.length > 26 && s1.nakshatraIndex < values.length) {
        const matchedRow1 = values[s1.nakshatraIndex];
        const matchedRow2 = values[s2.nakshatraIndex];
        if (matchedRow1 && matchedRow2 instanceof Object) {
          const body1 = matchedRow1.match;
          const dir1 = matchedRow1.dir;
          const body2 = matchedRow2.match;
          const dir2 = matchedRow2.dir;
          const sameBody = body1 === body2;
          const sameDir = dir1 === dir2;
          const bothUp = dir1 === 1 && dir2 === 1;
          const bothDown = dir1 === -1 && dir2 === -1;
          const oppositeDir =
            dir1 !== dir2 && [dir1, dir2].includes(0) === false;
          const dirLabel = dir => (dir === 1 ? '▲' : dir === -1 ? '▼' : '●');
          result.c1Value = ['rajju', body1, dirLabel(dir1)].join('/');
          result.c2Value = ['rajju', body2, dirLabel(dir2)].join('/');

          const protocolKey = this.itemOptions.get('rajju');
          const keys = Object.keys(settings);
          if (keys.includes(protocolKey)) {
            if (settings[protocolKey] instanceof Object) {
              const { scores, calc, max } = settings[protocolKey];
              if (max) {
                result.max = max;
              }
              if (scores instanceof Array) {
                const scoreRow = scores.find(sc => {
                  const scKeys = Object.keys(sc);
                  let validRule = false;
                  const hasRuleSet = scKeys.includes('rule');
                  if (hasRuleSet) {
                    validRule = Object.entries(sc.rule).every(entry => {
                      const [k, v] = entry;
                      switch (k) {
                        case 'bodyRel':
                          return (
                            (v === 'same' && sameBody) ||
                            (v === 'different' && !sameBody)
                          );
                        case 'eitherBody':
                          return body1 === v || body2 === v;
                        case 'otherBodyRel':
                          return (
                            (sameBody && v === 'same') ||
                            (!sameBody && v === 'different') ||
                            v === 'any'
                          );
                        case 'dir':
                          return dir1 === v && dir2 === v;
                        case 'dirRel':
                          return (
                            (oppositeDir && v === 'opposite') ||
                            (sameDir && v === 'same') ||
                            (bothUp && v === 'bothUp') ||
                            (bothDown && v === 'bothDown')
                          );
                      }
                    });
                  }
                  return validRule;
                });
                if (scoreRow) {
                  itemScore = scoreRow.score;
                }
                if (calc instanceof Array) {
                  const ruler1 = matchLord(s1);
                  const ruler2 = matchLord(s2);
                  const sameRulers = ruler1 === ruler2;
                  const signRulersRel1 = matchNaturalMaitri(ruler1, ruler2);
                  const signRulersRel2 = matchNaturalMaitri(ruler2, ruler1);
                  const pointSignAspect = calcInclusiveTwelfths(
                    s1.sign,
                    s2.sign,
                  );
                  const matchedRule = calc.find(cc => {
                    let valid = false;
                    if (cc instanceof Object) {
                      const { rule } = cc;
                      if (rule instanceof Object) {
                        valid = Object.entries(rule).every(entry => {
                          const [k, v] = entry;
                          switch (k) {
                            case 'bodyRel':
                              return v === 'same' && sameBody;
                            case 'signRulers':
                              return v === 'same' && sameRulers;
                            case 'dirRel':
                              return v === 'opposite' && oppositeDir;
                            case 'signRulersRelations':
                              return matchRelations(
                                signRulersRel1,
                                signRulersRel2,
                                v as string,
                              );
                            case 'pointSignAspect':
                              return pointSignAspect === 7;
                          }
                        });
                      }
                    }
                    return valid;
                  });
                  if (matchedRule) {
                    const { add } = matchedRule;
                    if (isNumeric(add)) {
                      itemScore += add;
                    }
                  }
                }
                result.score = itemScore;
              }
            }
          }
        }
      }
    }
  }

  _calcStri(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst = true,
  ) {
    const [s1, s2] = dataSets;
    const [female, male] = femaleFirst ? [s1, s2] : [s2, s1];
    const protocolKey = this.itemOptions.get('stri');
    const keys = Object.keys(settings);
    const nakDiff = calcInclusiveNakshatras(
      female.nakshatraNum,
      male.nakshatraNum,
    );
    let itemScore = 0;
    if (keys.includes(protocolKey)) {
      if (settings[protocolKey] instanceof Object) {
        const { scores, max, sameNakshatra, mfPada } = settings[protocolKey];
        result.max = max;
        if (scores instanceof Array && scores.length > 0) {
          const scoreRow = scores.find(sc => inRange(nakDiff, sc.diffRange));
          if (scoreRow) {
            itemScore = scoreRow.score;
          }
        }
        if (
          nakDiff === 1 &&
          sameNakshatra instanceof Array &&
          sameNakshatra.length > 0
        ) {
          const snRow = sameNakshatra.find(sc =>
            sc.nums.includes(female.nakshatraNum),
          );
          if (snRow) {
            itemScore += snRow.add;
          }
        }
        if (nakDiff === 1 && mfPada instanceof Array && mfPada.length > 0) {
          /* const padaDiff = female.nakshatra.pada - male.nakshatra.pada;
          const pdRow = mfPada.find(pd => pd.diff === padaDiff);
          if (pdRow) {
            itemScore += pdRow.add;
          } */
        }
      }
    }
    result.score = itemScore;
  }

  _calcGotra(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
  ) {
    const { matches, scores } = settings;
    if (matches instanceof Array && scores instanceof Array) {
      const [s1, s2] = dataSets;
      const nak28Index1 = s1.nakshatra28Num - 1;
      const nak28Index2 = s2.nakshatra28Num - 1;
      const gotraNum1 = matches[nak28Index1];
      const gotraNum2 = matches[nak28Index2];
      const sameGotra = gotraNum1 === gotraNum2;
      const scoreRow = scores.find(
        sc =>
          (sameGotra && sc.gotra === 'same') ||
          (!sameGotra && sc.gotra === 'different'),
      );
      if (scoreRow) {
        result.score = scoreRow.score;
      }
    }
  }

  _calcVainashika(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst,
  ) {
    const { matches, scores } = settings;
    if (matches instanceof Array && scores instanceof Array) {
      const [s1, s2] = dataSets;
      const female = femaleFirst ? s1 : s2;
      const male = femaleFirst ? s2 : s1;
      const hasMatch =
        matches.filter(
          mr => mr.f === female.nakshatraNum && mr.m === male.nakshatraNum,
        ).length > 0;
      const scoreRow = scores.find(sc => hasMatch === sc.match);
      if (scoreRow) {
        result.score = scoreRow.score;
      }
    }
  }

  _calcYonyanukulya(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst,
  ) {
    const { matches, scores } = settings;
    if (matches instanceof Object && scores instanceof Object) {
      const protocolKey = this.itemOptions.get('yonyanukulya');
      const [protocolType, subType] = protocolKey.split('_');
      const scoreKey = subType === 'mnf' ? 'prashnaMarga_mnf' : 'classical';
      const [s1, s2] = dataSets;
      const female = femaleFirst ? s1 : s2;
      const male = femaleFirst ? s2 : s1;
      const matchKeys = Object.keys(matches);
      if (matchKeys.includes(protocolKey)) {
        const genderMatches = matches[protocolKey];
        if (genderMatches instanceof Array) {
          const femaleNakGender = genderMatches[female.nakshatraIndex];
          const maleNakGender = genderMatches[male.nakshatraIndex];
          const scoreKeys = Object.keys(scores);
          const s1Gender = femaleFirst ? femaleNakGender : maleNakGender;
          const s2Gender = femaleFirst ? maleNakGender : femaleNakGender;
          if (scoreKeys.includes(scoreKey)) {
            const scoreRows = scores[scoreKey];
            if (scoreRows instanceof Array) {
              const scoreRow = scoreRows.find(
                sr => sr.f === femaleNakGender && sr.m === maleNakGender,
              );
              if (scoreRow) {
                result.score = scoreRow.score;
              }
            }
          }
        }
      }
    }
  }

  _calcVihanga(
    settings: any,
    result: KutaValueSet,
    dataSets: Array<KutaGrahaItem>,
    femaleFirst,
  ) {
    const protocolKey = this.itemOptions.get('vihanga');
    const { matches, scores } = settings;
    if (matches instanceof Object && scores instanceof Object) {
      const matchKeys = Object.keys(matches);
      const scoreKeys = Object.keys(scores);
      const [s1, s2] = dataSets;
      const matchWaxWaneSetIndex = (subject: KutaGrahaItem): number =>
        subject.moonWaxing ? 0 : 1;
      let v1 = 0;
      let v2 = 0;
      if (matchKeys.includes(protocolKey)) {
        if (matches[protocolKey] instanceof Array) {
          if (matches[protocolKey].length === 2) {
            if (matches[protocolKey].every(row => row instanceof Array)) {
              v1 =
                matches[protocolKey][matchWaxWaneSetIndex(s1)][
                  s1.nakshatraIndex
                ];
              v2 =
                matches[protocolKey][matchWaxWaneSetIndex(s2)][
                  s2.nakshatraIndex
                ];
            }
          } else if (matches[protocolKey].length > 26) {
            v1 = matches[protocolKey][s1.nakshatraIndex];
            v2 = matches[protocolKey][s2.nakshatraIndex];
          }
        }
      }
      if (scoreKeys.includes(protocolKey)) {
        const scoreSet = scores[protocolKey];
        if (scoreSet instanceof Object) {
          const scoreSetKeys = Object.keys(scoreSet);
          if (scoreSetKeys.includes('order')) {
            const { order, scores } = scoreSet;
            const deltas = [order.indexOf(v1), order.indexOf(v2)];
            deltas.sort((a, b) => b - a);
            const diff = (deltas[0] = deltas[1]);
            const scoreRow = scores.find(sc => sc.diff === diff);
            if (scoreRow) {
              result.score = scoreRow.score;
            }
          } else if (scoreSetKeys.includes('rels')) {
            const { rels, scores } = scoreSet;
            if (rels instanceof Array) {
              let relType = '';
              if (v1 === v2) {
                relType = 'same';
              } else {
                const relRow = rels.find(r => r.num === v1);
                if (relRow) {
                  if (relRow.enemies.includes(v2)) {
                    relType = 'enemies';
                  } else if (relRow.friends.includes(v2)) {
                    relType = 'friends';
                  }
                }
              }
              if (relType.length > 2) {
                const scoreRow = scores.find(sc => sc.type === relType);

                if (scoreRow) {
                  result.score = scoreRow.score;
                }
              }
            }
          }
        }
      }
    }
  }

  diginityKey(dignities: DictMatch[], rel = '') {
    const dictRow = dignities.find(row => row.key === rel);
    let dictKey = '';
    if (dictRow) {
      dictKey = dictRow.dict;
    }
    return ['dignity', dictKey].join('/');
  }
}

export interface MaxScore {
  score: number;
  max: number;
}

export interface MaxScoreSet extends MaxScore {
  k1: string;
  k2: string;
}

export const calcKutaTotal = (
  kutaVS: KutaValueSet[],
  keys: string[] = [],
): MaxScore => {
  const filteredItems = kutaVS.filter(row => keys.includes(row.variantKey));
  const score = filteredItems.map(row => row.score).reduce((a, b) => a + b, 0);
  const max = filteredItems.map(row => row.max).reduce((a, b) => a + b, 0);
  return {
    score,
    max,
  };
};

export const calcKutaRowTotal = (
  kutaRow: KutaValueSetItems[],
  keys: string[] = [],
): MaxScoreSet[] => {
  return kutaRow.map(row => {
    const { k1, k2, values } = row;
    const { max, score } = calcKutaTotal(values, keys);
    return {
      k1,
      k2,
      score,
      max,
    };
  });
};

export const calcAshtaKutaRowTotal = (kutaRow: KutaValueSetItems[] = []) => {
  return calcKutaRowTotal(kutaRow, ashtaKeys);
};

export const calcDashaKutaRowTotal = (kutaRow: KutaValueSetItems[] = []) => {
  return calcKutaRowTotal(kutaRow, dashaKeys);
};

export const calcDvadashaKutaRowTotal = (kutaRow: KutaValueSetItems[] = []) => {
  return calcKutaRowTotal(kutaRow, dvadashaKeys);
};

export const calcSaptaKutaRowTotal = (kutaRow: KutaValueSetItems[] = []) => {
  return calcKutaRowTotal(kutaRow, saptaKeys);
};

import { GeoLoc } from './geo-loc';
import {
  AyanamshaItem,
  SurfaceTSData,
  ProgressSetItem,
  ProgressResult,
} from '../interfaces';
import { KeyNumValue } from '../../../lib/interfaces';
import {
  subtractLng360,
  calcDist360,
  calcVargaSet,
  calcSign,
  subtractSign,
  calcAspectIsApplying,
  toCamelCase,
  capitalize,
} from '../helpers';
import {
  calcAllBodyLngsJd,
  calcAyanamsha,
  calcJdPeriodRange,
  fetchHouseDataJd,
  relativeAngle,
} from './../core';
import {
  julToISODate,
  weekDayNum,
  toDateTime,
  shortTzAbbr,
  hourMinTz,
  julToDateFormat,
  matchJdAndDatetime,
} from './../date-funcs';
import muhurtaValues from './../settings/muhurta-values';
import caughadiaData from './../settings/caughadia-data';
import kalamData from './../settings/kalam-data';
import { calcKarana } from './../settings/karana-data';
import horaValues from './../settings/hora-values';
import { calcTithi } from './../settings/tithi-values';
import { calcVara } from './../settings/vara-values';
import { calcYoga } from './../settings/yoga-values';
import houseTypeData from './../settings/house-type-data';
import { KaranaSet } from './karana-set';
import { MuhurtaSet, MuhurtaItem } from './muhurta-set';
import { inRange, isNumeric, notEmptyString } from './../../../lib/validators';
import { TransitionSet } from './transition-set';
import { UpagrahaValue, matchUpapadaKey } from './upagraha-value';
import {
  matchReference,
  Graha,
  coreIndianGrahaKeys,
  indianGrahaAndPointKeys,
} from './graha-set';
import rashiValues from '../settings/rashi-values';
import ayanamshaValues, {
  matchAyanamshaNum,
} from '../settings/ayanamsha-values';
import {
  BooleanSet,
  buildSignHouse,
  Condition,
  ConditionSet,
  ObjectType,
  Protocol,
  ProtocolResultSet,
  RuleSet,
  matchAspectRanges,
  funcBmMap,
  matchBmGrahaKeys,
} from './protocol-models';
import { calcInclusiveSignPositions } from '../math-funcs';
import { naturalBenefics, naturalMalefics, combustionOrbs } from '../settings/graha-values';
import { BmMatchRow, SignHouse } from '../../interfaces/sign-house';
import { Kuta } from '../kuta';
import { matchKotaPala } from '../settings/kota-values';
import { combineCharts, filterBmMatchRow } from '../chart-funcs';
import { locStringToGeo } from '../converters';
import { keyValuesToSimpleObject } from '../../../lib/converters';
import { currentJulianDay } from '../julian-date';
import { extractCorePlaceNames } from '../mappers';
import { GeoPos } from '../../interfaces/geo-pos';
import { mapRelationships } from '../map-relationships';
import { matchLord } from '../settings/maitri-data';
import { matchPanchangaTerm } from '../settings/panchanga-values';

export interface Subject {
  name: string;
  type: string;
  notes?: string;
  gender: string;
  eventType: string;
  roddenValue: number;
  roddenScale: string;
}

const emptySubject = {
  name: '',
  type: 'person',
  gender: '-',
  eventType: 'birth',
  roddenValue: 100000,
  roddenScale: '',
};

export interface GrahaTransition {
  type: string;
  jd: number;
  datetime: Date;
}

export interface Placetype {
  name: string;
  fullName: string;
  type: string;
}

export interface Placename extends Placetype {
  geo: GeoLoc;
}

export interface Placeref extends Placetype {
  geo: GeoPos;
  lat?: number;
  lng?: number;
}

export interface LngLat {
  lng: number;
  lat: number;
}

export interface BaseGraha {
  key: string;
  num: number;
  lng: number;
  lat: number;
  topo: LngLat;
  lngSpeed: number;
  declination: number;
  variants: Variant[];
  transitions: Array<GrahaTransition>;
}

export interface HouseSystem {
  system: string;
  values: Array<number>;
}

export interface Variant {
  num: number; // ayanamsha ref number
  sign: number;
  house: number;
  nakshatra: number;
  relationship: string;
  charaKaraka?: number;
}

export interface VariantSet {
  num: number;
  items: KeyNumValue[];
}

export interface ObjectMatch {
  key: string;
  type: string;
  value: any;
  refVal?: number;
}

export interface ObjectMatchSet {
  num: number;
  items: Array<ObjectMatch>;
}

export interface ITime {
  year: number;
  dayNum: number;
  progress: number;
  dayLength: number;
  isDayTime: boolean;
  dayBefore: boolean;
  dayStart: number;
  muhurta: number;
  ghati: number;
  vighati: number;
  lipta: number;
  weekDayNum?: number;
}

interface Muhurta {
  num: number;
  quality: string;
  jd: number;
  dt: string;
  exDays: Array<number>;
  active: boolean;
}

export interface RashiItem {
  houseNum: number;
  sign: number;
  lordInHouse: number;
  arudhaInHouse: number;
  arudhaInSign: number;
  arudhaLord: string;
}

export interface RashiItemSet {
  num: number;
  items: Array<RashiItem>;
}

export interface NumValueSet {
  num: number;
  items: Array<KeyNumValue>;
}

export interface KeyPairVal {
  k1: string;
  k2: string;
  value: number;
}

export interface KutaValSet {
  k1: string;
  k2: string;
  values: KeyNumValue[];
}

export class Chart {
  _id?: string;
  user: string;
  isDefaultBirthChart: boolean;
  subject = emptySubject;
  datetime: Date;
  jd: number;
  geo = new GeoLoc([0, 0, 0]);
  placenames: Array<Placename> = [];
  tz: string;
  tzOffset: number;
  ascendant: number;
  ecliptic?: number;
  ascDeclination?: number;
  mc: number;
  vertex: number;
  grahas: Array<BaseGraha> = [];
  houses: Array<HouseSystem> = [];
  indianTime: ITime;
  ayanamshas: Array<KeyNumValue> = [];
  upagrahas: Array<KeyNumValue> = [];
  sphutas: Array<VariantSet> = [];
  keyValues: Array<KeyNumValue> = [];
  objects: Array<ObjectMatchSet> = [];
  createdAt?: Date;
  modifiedAt?: Date;
  ayanamshaItem?: AyanamshaItem;
  progressItems?: ProgressSetItem[] = [];
  vargaNum = 1;
  surface: SurfaceTSData = {
    geo: { lat: 0, lng: 0 },
    ascendant: -90,
    tzOffset: 0,
  };
  [key: string]: any;

  constructor(result: any = null, surface = null) {
    if (result instanceof Object) {
      Object.entries(result).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case '_id':
          case 'user':
          case 'tz':
            if (typeof v === 'string') {
              this[k] = v;
            } else if (v) {
              this[k] = v.toString();
            }
            break;
          case 'subject':
            if (v instanceof Object) {
              this[k] = v as Subject;
            }
            break;
          case 'indianTime':
            if (v instanceof Object) {
              this[k] = v as ITime;
            }
            break;
          case 'geo':
            this.geo = new GeoLoc(v);
            break;
          case 'datetime':
          case 'createdAt':
          case 'modifiedAt':
            if (typeof v === 'string') {
              this[k] = toDateTime(v);
            } else if (v instanceof Date) {
              this[k] = v;
            }
            break;
          case 'jd':
          case 'mc':
          case 'ascendant':
          case 'vertex':
          case 'ecliptic':
          case 'tzOffset':
            if (typeof v === 'number') {
              this[k] = v;
            } else if (typeof v === 'string') {
              if (isNumeric(v)) {
                this[k] = parseFloat(v);
              }
            }
            break;
          case 'grahas':
            if (v instanceof Array) {
              this.grahas = v.filter(g => g instanceof Object);
            }
            break;
          case 'placenames':
          case 'sphutas':
          case 'upagrahas':
          case 'keyValues':
          case 'objects':
          case 'houses':
          case 'ayanamshas':
          case 'progressItems':
            if (v instanceof Array) {
              this[k] = v;
            }
            break;
        }
      });
    }
    if (surface instanceof Object) {
      this.surface = surface;
    }
  }

  setVarga(num = 1) {
    this.vargaNum = num;
  }

  setAyanamshaItem(ayanamshaItem: AyanamshaItem) {
    const value = this.getAyanamshaValue(ayanamshaItem.key);
    const av = value >= 0 ? { ...ayanamshaItem, value } : ayanamshaItem;
    this.ayanamshaItem = Object.assign({}, av);
    return this.ayanamshaItem;
  }

  setAyanamshaItemByNum(num: number) {
    const aRow = ayanamshaValues.find(a => a.value === num);
    const value = this.getAyanamshaValue(aRow.key);
    this.ayanamshaItem = {
      num,
      key: aRow.key,
      value,
      name: aRow.name,
    };
    return this.ayanamshaItem;
  }

  setAyanamshaItemByKey(key: string) {
    const aRow = ayanamshaValues.find(a => a.key === key);
    const value = this.getAyanamshaValue(key);
    this.ayanamshaItem = {
      num: aRow.value,
      key,
      value,
      name: aRow.name,
    };
    return this.ayanamshaItem;
  }

  getAyanamshaValue(key: string): number {
    const item = this.ayanamshas.find(a => a.key === key);
    if (item) {
      return item.value;
    } else {
      return -1;
    }
  }

  matchObjectValue(objType: ObjectType, key = '') {
    const refKey = key.length > 1 ? key : objType.key;
    switch (objType.type) {
      case 'graha':
        return this.graha(refKey).longitude;
      case 'upapada':
        return this.matchUpapada(refKey);
      case 'special':
      case 'lots':
        switch (refKey) {
          case 'yogi_graha':
          case 'avayogi_graha':
            const gk = this.matchObject(refKey.replace(/_graha$/, ''));
            return this.graha(gk).longitude;
          case 'mandi':
          case 'gulika':
            return this.matchUpagraha(refKey);
          default:
            return this.matchSpecial(refKey);
        }

      default:
        return null;
    }
  }

  /*
  Adapt the chart object to a simpler data set
  */
  toBaseSet(ayanamshaKey = 'true_citra') {
    const bodies = this.bodies.filter(bd => bd.num >= 0);
    bodies.push(this.ascendantGraha);
    bodies.push(this.descendantGraha);
    return {
      jd: this.jd,
      geo: this.geo,
      ayanamsha: this.getAyanamshaValue(ayanamshaKey),
      birth: keyValuesToSimpleObject(bodies, 'lng'),
    };
  }

  matchUpapada(refKey = '') {
    const { key, type } = matchUpapadaKey(refKey);
    switch (type) {
      case 'sphutas':
        return this.matchSpecial(key);
      default:
        return 0;
    }
  }

  matchSpecial(key: string) {
    const row = this.sphutas.find(
      spSet => spSet.num === this.ayanamshaItem.num,
    );
    let numVal = 0;
    const camelKey = toCamelCase(key);
    if (row instanceof Object) {
      const item = row.items.find(sp => sp.key === camelKey);
      if (item instanceof Object) {
        numVal = item.value;
      }
    }
    return numVal;
  }

  matchObject(key: string): string {
    const row = this.objects.find(
      spSet => spSet.num === this.ayanamshaItem.num,
    );
    let strVal = '';
    if (row instanceof Object) {
      const item = row.items.find(sp => sp.key === key);
      if (item instanceof Object) {
        strVal = item.value;
      }
    }
    return strVal;
  }

  matchUpagraha(refKey: string) {
    let numVal = 0;
    let key = refKey.length > 2 ? refKey.substring(0, 2) : refKey;
    switch (refKey) {
      case 'gulika':
        key = 'gk';
        break;
      case 'mandi':
        key = 'md';
        break;
    }
    const item = this.upagrahaValues.find(sp => sp.key === key);
    if (item instanceof ObjectType) {
      numVal = item.value;
    }
    return numVal;
  }

  funcBmMap(build = true): Map<string, Array<string>> {
    return funcBmMap(this, build);
  }

  matchBM(type = 'benefic', isFunctional = false) {
    const bm = this.funcBmMap(isFunctional);
    const isMalefic = type.includes('malef');
    const letter = isMalefic ? 'm' : 'b';
    return isFunctional
      ? bm.get(letter)
      : isMalefic
      ? naturalMalefics
      : naturalBenefics;
  }

  mapProgressItem(item: any = null) {
    if (item instanceof Object) {
      const { jd, pd, ayanamsha } = item;
      const bodies = keyValuesToSimpleObject(
        item.bodies.map(row => {
          const value = subtractLng360(row.value, ayanamsha);
          return { key: row.key, value };
        }),
        'value',
      );

      return { jd, pd, bodies, ayanamsha, valid: true, applied: true };
    } else {
      return {
        jd: 0,
        pd: 0,
        bodies: {},
        ayanamsha: 0,
        valid: false,
        applied: false,
      };
    }
  }

  calcRelationship(key = '') {
    const gr = this.graha(key)
    const lord = matchLord(gr);
    return mapRelationships(
      gr.sign,
      this.graha(lord).sign,
      gr.isOwnSign,
      gr.natural
    );
  }

  matchProgressItem(refJd = 0, tolerance = 45): ProgressResult {
    const jd = refJd > 1000 ? refJd : currentJulianDay();
    const startJd = jd - tolerance;
    const endJd = jd + tolerance;
    const item = this.progressItems.find(
      pi => pi.jd >= startJd && pi.jd <= endJd,
    );
    return this.mapProgressItem(item);
  }

  matchProgressItems(past = 2, future = 8): ProgressResult[] {
    const currJd = currentJulianDay();
    const jdAgo = currJd - (365.25 * past);
    const jdFuture = currJd + (365.25 * (future + 0.5));
    const items = this.progressItems.filter(
      pi => pi.jd >= jdAgo && pi.jd <= jdFuture,
    );
    return items.map(this.mapProgressItem);
  }

  get kotaSvami() {
    const moonSign = this.graha('mo').signNum;
    const rashi = rashiValues.find(r => r.num === moonSign);
    return rashi instanceof Object ? rashi.ruler : '';
  }

  get kotaPala() {
    const moonLng = this.graha('mo').longitude;
    return matchKotaPala(moonLng);
  }

  get ayanamshaOffset() {
    if (this.ayanamshaItem instanceof Object) {
      return this.ayanamshaItem.value;
    } else {
      return 0;
    }
  }

  get surfaceAscendantGraha() {
    let lng = 0;
    if (this.surface.ascendant >= 0) {
      lng = this.surface.ascendant;
    }
    return this.buildGraha('as', lng, 0);
  }

  get surfaceGeo() {
    return this.surface.geo;
  }

  get ayanamshaNum() {
    if (this.ayanamshaItem instanceof Object) {
      return this.ayanamshaItem.num;
    } else {
      return 0;
    }
  }

  get weekDayNum() {
    return this.indianTime.weekDayNum;
  }

  // adjusted ascendant
  get lagna() {
    return subtractLng360(this.ascendant, this.ayanamshaOffset);
  }

  get firstHouseSign() {
    return Math.floor(this.lagna / 30) + 1;
  }

  get ascendantGraha(): Graha {
    return this.buildGraha('as', this.ascendant, 0);
  }

  get descendant() {
    return (this.ascendant + 180) % 360;
  }

  get descendantGraha(): Graha {
    return this.buildGraha('ds', this.descendant, 0);
  }

  get mandiGraha(): Graha {
    const mn = this.upagrahas.find(up => up.key === 'md');
    let lng = 0;
    if (mn) {
      lng = mn.value;
    }
    return this.buildGraha('md', lng);
  }

  get gulikaGraha(): Graha {
    const gu = this.upagrahas.find(u => u.key === 'gu');
    let lng = 0;
    if (gu) {
      lng = gu.value;
    }
    return this.buildGraha('gu', lng);
  }

  get ic() {
    return (this.mc + 180) % 360;
  }

  get mcGraha(): Graha {
    return this.buildGraha('mc', this.mc);
  }

  get icGraha(): Graha {
    return this.buildGraha('ic', this.ic);
  }

  get gender() {
    return this.subject instanceof Object ? this.subject.gender : '';
  }

  get isDayTime() {
    return this.indianTime instanceof Object
      ? this.indianTime.isDayTime
      : false;
  }

  // If values are not from a birth chart, the sidereal natal ascendant must be specified
  relativeLoFDay(isBirth = true, birthLagna = 0) {
    const relLagna = isBirth ? this.lagna : birthLagna;
    return (
      (relLagna + (this.moon.longitude - this.sun.longitude) + 360) % 360
    );
  }

  // If values are not from a birth chart, the sidereal natal ascendant must be specified
  relativeLoFNight(isBirth = true, birthLagna = 0) {
    const relLagna = isBirth ? this.lagna : birthLagna;
    return (relLagna + this.sun.longitude - this.moon.longitude + 360) % 360;
  }

  get loFDay() {
    return this.relativeLoFDay();
  }

  get loFNight() {
    return this.relativeLoFNight();
  }

  // required for current lot of fortune relative to someone's birth ascendant and time of birth (night or day)
  relativeLotFortune(birthLagna = 0, isDayTime = true) {
    return isDayTime ? this.relativeLoFDay(false, birthLagna) : this.relativeLoFNight(false, birthLagna);
  }

  // This follows the reverse logic of Lot of fortune
  relativeLotSpirit(birthLagna = 0, isDayTime = true) {
    return this.relativeLotFortune(birthLagna, !isDayTime);
  }

  get lotOfFortune() {
    return this.isDayTime ? this.loFDay : this.loFNight;
  }

  get lotOfSpirit() {
    return this.isDayTime ? this.loFNight : this.loFDay;
  }

  buildGreekLot(key: string, ref = 'F') {
    const grLng = this.graha(key).longitude;
    const reverse = ref === 'F';
    const refLotLng = ref === 'S' ? this.lotOfSpirit : this.lotOfFortune;
    const bodyFirst =
      (this.isDayTime && !reverse) || (!this.isDayTime && reverse);
    return bodyFirst
      ? (this.lagna + (grLng - refLotLng) + 360) % 360
      : (this.lagna + (refLotLng - grLng) + 360) % 360;
  }

  get lotOfNecessity() {
    return this.buildGreekLot('me', 'F');
  }

  get lotOfEros() {
    return this.buildGreekLot('ve', 'S');
  }

  get lotOfCourage() {
    return this.buildGreekLot('ma', 'F');
  }

  get lotOfVictory() {
    return this.buildGreekLot('ju', 'S');
  }

  get lotOfNemesis() {
    return this.buildGreekLot('sa', 'F');
  }

  get lotOfSexMale() {
    const g1 = this.graha('ve').longitude;
    const g2 = this.graha('su').longitude;
    return (this.lagna + g1 - g2 + 360) % 360;
  }

  get lotOfSexFemale() {
    const g1 = this.graha('ma').longitude;
    const g2 = this.graha('mo').longitude;
    return (this.lagna + g1 - g2 + 360) % 360;
  }

  get lotOfChildren() {
    return this.buildGrahaDayTimeSwitchLot('sa', 'ju');
  }

  get lotOfBasis() {
    const arc1 = subtractLng360(this.lotOfFortune, this.lotOfSpirit);
    const arc2 = subtractLng360(this.lotOfSpirit, this.lotOfFortune);
    const arc = arc1 < arc2 ? arc1 : arc2;
    return (this.lagna + arc + 360) % 360;
  }

  get lotOfExaltation() {
    const secondPart = this.isDayTime
      ? 19 - this.sun.longitude
      : 33 - this.moon.longitude;
    return (this.lagna + secondPart + 360) % 360;
  }

  get lotOfMarriage() {
    return this.buildGrahaDayTimeSwitchLot('ve', 'ju');
  }

  buildGrahaDayTimeSwitchLot(refK1: string, refK2: string) {
    const k1 = this.isDayTime ? refK1 : refK2;
    const k2 = this.isDayTime ? refK2 : refK1;
    const g1 = this.graha(k1).longitude;
    const g2 = this.graha(k2).longitude;
    return (this.lagna + g1 - g2 + 360) % 360;
  }

  buildGraha(key: string, lng: number, houseIndex = -1): Graha {
    const gr = matchReference(key, { lng });
    gr.setAyanamshaItem(this.ayanamshaItem);
    gr.setVarga(this.vargaNum);
    const hi =
      houseIndex < 0
        ? subtractSign(calcSign(gr.longitude), calcSign(this.lagna))
        : houseIndex;
    gr.variants = [
      {
        num: this.ayanamshaNum,
        house: hi + 1,
        sign: calcSign(gr.longitude),
        nakshatra: Math.floor(gr.longitude / 27) + 1,
        relationship: '',
        charaKaraka: 0,
      },
    ];
    return gr;
  }

  get name() {
    let str = '';
    if (this.subject instanceof Object) {
      const { name } = this.subject;
      if (notEmptyString(name)) {
        str = name;
      }
    }
    return str;
  }

  get shortName() {
    return this.shortenName(10);
  }

  get mediumName() {
    return this.shortenName(15);
  }

  shortenName(maxLength = 10) {
    let str = this.name.split(' ').shift();
    if (str.length > maxLength) {
      str = str.substring(0, maxLength);
    }
    return str;
  }

  get muhurta() {
    let m = {
      num: 0,
      quality: '',
      jd: 0,
      dt: null,
      exDays: [],
      active: false,
    };
    if (this.hasIndianTime) {
      const { dayStart, dayLength, muhurta } = this.indianTime;
      if (muhurta < muhurtaValues.length) {
        const mv = muhurtaValues[muhurta];
        const jd = dayStart + (dayLength / 30) * muhurta;
        m = { ...mv, jd, dt: julToISODate(jd), active: true };
      }
    }
    return new MuhurtaItem(m);
  }

  get muhurtas(): MuhurtaSet {
    const ms: Array<Muhurta> = [];
    if (this.hasIndianTime) {
      const { dayStart, dayLength, muhurta } = this.indianTime;
      if (muhurta < muhurtaValues.length) {
        for (let i = 0; i < 30; i++) {
          const mv = muhurtaValues[i];
          const jd = dayStart + (dayLength / 30) * i;
          ms.push({
            ...mv,
            jd,
            dt: julToISODate(jd),
            active: muhurta === i,
          });
        }
      }
    }
    return new MuhurtaSet({ values: ms });
  }

  get upagrahaValues(): Array<UpagrahaValue> {
    const items = this.upagrahas.map(
      row => new UpagrahaValue(row, this.ayanamshaItem.value),
    );
    items.sort((a, b) => a.sort - b.sort);
    return items;
  }

  get moonPhase(): number {
    const lng = (this.moon.longitude + 360 - this.sun.longitude) % 360;
    return Math.floor(lng / 90) + 1;
  }

  get overHalfLight() {
    const deg = this.sunMoonAngle;
    return deg > 90 && deg < 270;
  }

  get underHalfLight() {
    return !this.overHalfLight;
  }

  get moonWaxing(): boolean {
    return this.moonPhase <= 2;
  }

  getVargaSet() {
    return this.grahas.map(b =>
      calcVargaSet(subtractLng360(b.lng, this.ayanamshaOffset), b.num, b.key),
    );
  }

  get bodies(): Array<Graha> {
    return this.grahas.map(gr => {
      const graha = new Graha(gr);
      graha.setAyanamshaItem(this.ayanamshaItem);
      graha.setVarga(this.vargaNum);
      return graha;
    });
  }

  grahaRow(key: string) {
    return this.grahas.find(gr => gr.key === key);
  }

  graha(key: string): Graha {
    let graha = new Graha(null);
    switch (key) {
      case 'as':
        graha = this.ascendantGraha;
        break;
      case 'ds':
        graha = this.descendantGraha;
        break;
      case 'md':
        graha = this.mandiGraha;
        break;
      case 'gu':
        graha = this.gulikaGraha;
        break;
      case 'mc':
        graha = this.mcGraha;
        break;
      case 'ic':
        graha = this.icGraha;
        break;
      default:
        graha = this.matchBodyAsGraha(key);
        break;
    }

    graha.setAyanamshaItem(this.ayanamshaItem);
    graha.setVarga(this.vargaNum);
    return graha;
  }

  grahasByKeys(keys: string[] = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa', 'ke', 'ra', 'as']): Graha[] {
    return keys.map(k => {
      const g = this.graha(k);
      if (this.ayanamshaItem) {
        g.setAyanamshaItem(this.ayanamshaItem);
      }
      return g;
    });
  }

  matchBodyAsGraha(key = '') {
    const gr = this.bodies.find(b => b.key === key);
    if (gr instanceof Object) {
      return gr;
    } else {
      return new Graha(this.grahaRow(key));
    }
  }

  get sunRow() {
    return this.grahaRow('su');
  }

  get sun(): Graha {
    return this.graha('su');
  }

  get moon(): Graha {
    return this.graha('mo');
  }

  get sunTransitions() {
    let transitions: Array<GrahaTransition> = [];
    if (this.sunRow) {
      transitions = this.sunRow.transitions;
    }
    return transitions;
  }

  sunTransition(key = 'rise'): GrahaTransition {
    let transition = { type: '', jd: 0, datetime: null };
    if (this.sunRow) {
      const tr = this.sunRow.transitions.find(tr => tr.type === key);
      if (tr instanceof Object) {
        transition = tr;
      }
    }
    return transition;
  }

  digBala(key: string) {
    const grLng = this.graha(key).longitude;
    let diff = 0;
    switch (key) {
      case 'su':
      case 'ma':
        diff = this.icGraha.longitude - grLng;
        break;
      case 'me':
      case 'ju':
        diff = this.descendantGraha.longitude - grLng;
        break;
      case 'mo':
      case 've':
        diff = this.mcGraha.longitude - grLng;
        break;
      case 'sa':
        diff = this.ascendantGraha.longitude - grLng;
        break;
    }
    const absVal = Math.abs(diff);
    const dist = absVal > 180 ? 360 - absVal : absVal;
    return dist / 3;
  }

  isCombusted(key = '') {
    const relKeys = Object.keys(combustionOrbs);
    let valid = false;
    if (relKeys.includes(key)) {
      const orbRow = combustionOrbs[key];
      const graha = this.graha(key);
      const isRetro = graha.lngSpeed < 0;
      const distance = calcDist360(this.sun.longitude, graha.longitude);
      const orb = isRetro? orbRow.retro : orbRow.direct;
      valid = distance <= orb;
    }
    return valid;
  }

  get sunRise() {
    return this.sunTransition('rise');
  }

  get sunSet() {
    return this.sunTransition('set');
  }

  get sunPrevSet() {
    return this.sunTransition('prevSet');
  }

  get sunPrevRise() {
    return this.sunTransition('prevRise');
  }

  get sunNextRise() {
    return this.sunTransition('nextRise');
  }

  get sunMoonAngle() {
    return relativeAngle(this.sun.longitude, this.moon.longitude);
  }

  get tithi() {
    if (this.hasIndianTime) {
      return calcTithi(this.sun.longitude, this.moon.longitude);
    } else {
      return {
        num: 0,
        lord: '',
        div: 0,
        percent: 0,
        value: 0,
        waxing: false,
        overHalfLight: false,
      };
    }
  }

  get yoga() {
    return calcYoga(this.sun.longitude, this.moon.longitude);
  }

  get karana(): KaranaSet {
    return calcKarana(this.sun.longitude, this.moon.longitude);
  }

  matchHouseSignRuler = (houseNum: number) => {
    const sign = this.signHouse(houseNum);
    const rashi = rashiValues.find(rv => rv.num === sign);
    let ruler = '';
    if (rashi instanceof Object) {
      ruler = rashi.ruler;
    }
    return ruler;
  };

  matchCharaKaraka(num: number) {
    let key = '';
    const matchedGr = this.grahas.find(gr =>
      gr.variants.some(
        v => v.num === this.ayanamshaNum && v.charaKaraka === num,
      ),
    );
    if (matchedGr instanceof Object) {
      key = matchedGr.key;
    }
    return key;
  }

  buildSignHouseRows(): Array<SignHouse> {
    return buildSignHouse(this.firstHouseSign);
  }

  get trikonaRulers() {
    return houseTypeData.trikonas.map(this.matchHouseSignRuler);
  }

  get kendraRulers() {
    return houseTypeData.kendras.map(this.matchHouseSignRuler);
  }

  get upachayaRulers() {
    return houseTypeData.upachayas.map(this.matchHouseSignRuler);
  }

  get dushtanaRulers() {
    return houseTypeData.dushtanas.map(this.matchHouseSignRuler);
  }

  get marakaRulers() {
    return houseTypeData.marakas.map(this.matchHouseSignRuler);
  }

  get yogaKaraka() {
    const matchedKey = this.kendraRulers.find(key =>
      this.trikonaRulers.includes(key),
    );
    return matchedKey ? matchedKey : '';
  }

  get hasIndianTime() {
    return this.indianTime instanceof Object;
  }

  get hasProgressItems() {
    return this.progressItems instanceof Array && this.progressItems.length > 0;
  }

  get hasCurrentProgressItems() {
    const currJd = currentJulianDay();
    return this.hasProgressItems && this.progressItems.filter(pi => pi.jd > currJd);
  }

  localDate(fmt = 'euro1', timePrecision = 's') {
    const opts = {
      time: ['h', 'm', 's'].includes(timePrecision),
      seconds: timePrecision === 's',
    };
    return julToDateFormat(this.jd, this.tzOffset, fmt, opts);
  }

  localTime(timePrecision = 's') {
    const opts = {
      time: ['h', 'm', 's'].includes(timePrecision),
      seconds: timePrecision === 's',
    };
    return julToDateFormat(this.jd, this.tzOffset, '-', opts);
  }

  getObjects(ayanamshaNum: number): Array<ObjectMatch> {
    let items: Array<ObjectMatch> = [];
    if (this.objects.length > 0) {
      const row = this.objects.find(set => set.num === ayanamshaNum);
      if (row) {
        items = row.items;
      }
    }
    return items;
  }

  getSphutaValues(ayanamshaNum: number): Array<KeyNumValue> {
    let items: Array<KeyNumValue> = [];
    if (this.sphutas.length > 0) {
      const row = this.sphutas.find(set => set.num === ayanamshaNum);
      if (row) {
        items = row.items;
      }
    }
    return items;
  }

  getObjectItem(key: string, ayanamshaNum: number) {
    const items = this.getObjects(ayanamshaNum);
    const item = items.find(row => row.key === key);
    return item instanceof Object
      ? item
      : { key: '', value: '', refVal: -1, type: '' };
  }

  getSphutaValue(key: string, ayanamshaNum: number) {
    const items = this.getSphutaValues(ayanamshaNum);
    const item = items.find(row => row.key === key);
    return item instanceof Object ? item.value : -1;
  }

  signHouse(houseNum: number, system = 'W') {
    switch (system) {
      case 'W':
        return ((this.firstHouseSign - 1 + houseNum - 1) % 12) + 1;
      default:
        return this.matchHouseSignValue(houseNum, system);
    }
  }

  matchHouseSignValue(houseNum: number, system = 'W') {
    const item = this.houses.find(hs => hs.system === system);
    let signIndex = -1;
    if (item) {
      const numHouses = item.values.length;
      const houseIndex = houseNum - 1;
      const secondHalf = houseNum > 6;
      const matchIndex = houseIndex % numHouses;
      const lng = secondHalf
        ? (item.values[matchIndex] + 180) % 360
        : item.values[matchIndex];
      signIndex = Math.floor(lng / 30);
    }
    return signIndex + 1;
  }

  matchLord(houseNum = 1) {
    const signIndex = this.signHouse(houseNum) - 1;
    const rashi = rashiValues[signIndex];
    return rashi instanceof Object ? rashi.ruler : '';
  }

  matchLords() {
    const lords: Array<ObjectMatch> = [];
    for (let n = 1; n <= 12; n++) {
      const value = this.matchLord(n);
      const refVal = this.graha(value).longitude;
      lords.push({
        key: ['houselord', n].join('_'),
        type: 'graha',
        value,
        refVal,
      });
    }
    return lords;
  }

  get sphutaValues(): Array<KeyNumValue> {
    return this.getSphutaValues(this.ayanamshaNum);
  }

  getVara() {
    if (this.hasIndianTime) {
      return calcVara(this.jd, this.indianTime, this.sunRise);
    }
  }

  get vara() {
    return this.getVara();
  }

  get hasVara() {
    return this.vara instanceof Object;
  }

  get hora() {
    if (this.hasIndianTime) {
      const { dayLength, isDayTime, dayBefore } = this.indianTime;
      const afterSunSet = this.jd > this.sunSet.jd;
      const startJd = dayBefore
        ? this.sunPrevSet.jd
        : afterSunSet
        ? this.sunSet.jd
        : this.sunRise.jd;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const horaRow = horaValues.find(row => row.day === weekDay);
      if (horaRow) {
        const numHoras = horaRow.hora.length;
        const horaLength = dayLength / numHoras;
        const difference = this.jd - startJd;
        const horaVal = difference / horaLength;
        const horaIndex = Math.floor(horaVal);
        const ruler = horaRow.hora[horaIndex];
        return {
          ...horaRow,
          ruler,
          index: horaIndex,
          weekDay,
          isDayTime,
        };
      }
    }
  }

  get hasHora() {
    return this.hora instanceof Object;
  }

  get kalam() {
    if (this.hasIndianTime) {
      const { dayBefore } = this.indianTime;
      const jd = this.jd;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const kalamDayRow = kalamData.values.find(row => row.day === weekDay);
      if (kalamDayRow) {
        const dayTimeStart = dayBefore ? this.sunPrevRise.jd : this.sunRise.jd;
        const dayTimeLength = dayBefore
          ? this.sunPrevSet.jd - dayTimeStart
          : this.sunSet.jd - dayTimeStart;
        const eighthJd = dayTimeLength / 8;
        const ranges = Object.entries(kalamData.dict).map(entry => {
          const [key, name] = entry;
          const range = calcJdPeriodRange(
            kalamDayRow[key],
            dayTimeStart,
            eighthJd,
          );
          const active = jd >= range.start && jd < range.end;
          const num = kalamDayRow[key];
          return { key, name, num, ...range, active };
        });
        return {
          dayTimeStart,
          dayTimeStartDt: julToISODate(dayTimeStart),
          day: kalamDayRow.day,
          ranges,
        };
      }
    }
  }

  get ghatiVal() {
    return this.hasIndianTime ? this.indianTime.progress * 60 : 0;
  }

  get progress() {
    return this.hasIndianTime ? this.indianTime.progress : 0;
  }

  get hasKalam() {
    return this.kalam instanceof Object;
  }

  get gmtOffset(): number {
    return this.tzOffset / 3600;
  }

  get tzText(): string {
    const abbr = shortTzAbbr(this.datetime, this.tz);
    let hoursOffset = '';
    if (/[A-Z]+/.test(abbr)) {
      hoursOffset = hourMinTz(this.tzOffset);
    }
    return [abbr, hoursOffset].join(' ').trim();
  }

  get corePlacenames(): string {
    return extractCorePlaceNames(this.placenames);
  }

  getTransitions() {
    return this.grahas.map(gr => {
      const { key, num, transitions } = gr;
      const rise = transitions.find(tr => tr.type === 'rise');
      const set = transitions.find(tr => tr.type === 'set');
      const mc = transitions.find(tr => tr.type === 'mc');
      const ic = transitions.find(tr => tr.type === 'ic');
      return new TransitionSet({
        num,
        key,
        rise,
        set,
        mc,
        ic,
      });
    });
  }

  getFullVargaSet() {
    const lagnaVarga = calcVargaSet(this.lagna, -1, 'as');
    const vargas = this.getVargaSet();
    return [lagnaVarga, ...vargas];
  }

  matchCaughadia(showDefault = true) {
    let cRows = [];
    if (this.hasIndianTime) {
      const { dayStart, dayBefore, isDayTime } = this.indianTime;
      const jd = this.jd;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const weekDayIndex = weekDay % caughadiaData.days.length;
      const caughadiaDayRow = caughadiaData.days.find(
        row => row.day === weekDayIndex,
      );
      const useDayTime = showDefault ? isDayTime : !isDayTime;
      if (caughadiaDayRow) {
        const caughadiaStart = isDayTime
          ? caughadiaDayRow.dayStart
          : caughadiaDayRow.nightStart;
        const caughadiaEighths = Array.from(
          { length: 8 },
          (x, i) => ((caughadiaStart - 1 + i) % 7) + 1,
        );
        const periodLength = this.calcPeriodLength(useDayTime, dayBefore);
        const eighthJd = periodLength / 8;
        const periodStart = useDayTime
          ? dayStart
          : dayBefore
          ? this.sunPrevSet.jd
          : this.sunSet.jd;
        cRows = caughadiaEighths.map((num, ri) => {
          const seq = ri + 1;
          const cRow = caughadiaData.values.find(row => row.num === num);
          const increment = ri * eighthJd;
          const startJd = periodStart + increment;
          const active = jd >= startJd && jd < startJd + eighthJd;
          let hasKala = false;
          let kala = '';
          if (useDayTime) {
            const kalaRow = this.kalam.ranges.find(kr => kr.num === seq);
            if (kalaRow) {
              kala = kalaRow.key;
              hasKala = true;
            }
          }
          return {
            seq,
            ...cRow,
            startJd,
            startDt: julToISODate(startJd),
            dayTime: useDayTime,
            hasKala,
            kala,
            active,
          };
        });
      }
    }
    return cRows;
  }

  calcPeriodLength(useDayTime = true, dayBefore = false) {
    const after = this.sunRise.jd < this.sunSet.jd;
    const riseJd = after ? this.sunRise.jd : this.sunPrevRise.jd;
    const prevAfter = this.sunPrevRise.jd < this.sunPrevSet.jd;
    const prevRiseJd = prevAfter
      ? this.sunPrevRise.jd
      : this.sunPrevRise.jd - 1;
    const nextRiseJd =
      this.sunNextRise.jd - this.sunSet.jd > 1
        ? this.sunRise.jd
        : this.sunNextRise.jd;
    return useDayTime
      ? dayBefore
        ? this.sunPrevSet.jd - prevRiseJd
        : this.sunSet.jd - riseJd
      : dayBefore
      ? riseJd - this.sunPrevSet.jd
      : nextRiseJd - this.sunSet.jd;
  }

  matchLng = (key: any, retVal = -1) => {
    const graha = this.graha(key);
    if (graha) {
      return graha.longitude;
    }
    return retVal;
  };

  addBodyLngs(keys: Array<any>) {
    return keys.map(k => this.matchLng(k, 0)).reduce((a, b) => a + b, 0) % 360;
  }

  calcYogiSphuta() {
    const deg = this.addBodyLngs(['su', 'mo']);
    const supplement = 93 + 1 / 3; /// 93 1/3
    return (deg + supplement) % 360;
  }

  calcBijaSphuta() {
    return this.addBodyLngs(['su', 've', 'ju']);
  }

  calcKsetraSphuta() {
    return this.addBodyLngs(['mo', 'ma', 'ju']);
  }
}

export const applyAyanamsha = (
  chart: Chart,
  grahas: Array<Graha>,
  item: AyanamshaItem,
) => {
  const av = chart.setAyanamshaItem(item);
  grahas.forEach(gr => {
    gr.setAyanamshaItem(av);
  });
};

export class Tag {
  slug = '';
  name = '';
  constructor(inData = null) {
    if (inData instanceof Object) {
      const { slug, name } = inData;
      if (typeof slug === 'string') {
        this.slug = slug;
      }
      if (typeof name === 'string') {
        this.name = name;
      }
    }
  }
}

const matchBMKey = (chart: Chart, key = '') => {
  const [mode, type] = key.split('_').pop();
  const isFunctional = mode.startsWith('fun');
  return chart.matchBM(type, isFunctional).join(',');
};

export const matchGrahaEquivalent = (
  obj: ObjectType,
  chart: Chart,
  ayanamshaNum = 27,
) => {
  const { key, type } = obj;
  let matchedKey = key;
  if (key.length > 2) {
    chart.setAyanamshaItemByNum(ayanamshaNum);
    const parts = key.split('_');
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      const section = parts[parts.length - 2];
      if (isNumeric(lastPart)) {
        const num = parseInt(lastPart);
        if (section === 'house') {
          matchedKey = chart.matchHouseSignRuler(num);
        } else if (section === 'chara') {
          matchedKey = chart.matchCharaKaraka(num);
        }
      } else {
        switch (lastPart) {
          case 'malefics':
          case 'benefics':
            matchedKey = lastPart;
            break;
        }
        switch (type) {
          case 'lots':
            matchedKey = ['lot', capitalize(lastPart)].join('Of');
            break;
        }
      }
    }
    if (matchedKey.length > 2) {
      chart.setAyanamshaItemByNum(ayanamshaNum);
      switch (matchedKey) {
        case 'kota_svami':
          matchedKey = chart.kotaSvami;
          break;
        case 'kota_pala':
        case 'kota_paala':
          matchedKey = chart.kotaPala;
          break;
        case 'nat_benefic':
        case 'nat_malefic':
        case 'func_benefic':
        case 'func_malefic':
          matchedKey = matchBMKey(chart, matchedKey);
          break;
      }
    }
  }
  return matchedKey;
};

export const matchSignNums = (key: string) => {
  const tail = key.split('__').pop();
  let signs: number[] = [];
  if (isNumeric(tail)) {
    signs = [parseInt(tail, 10)];
  } else {
    switch (tail) {
      case 'odd':
        signs = [1, 3, 5, 7, 9, 11];
        break;
      case 'even':
        signs = [2, 4, 6, 8, 10, 12];
        break;
      case 'fire':
      case 'earth':
      case 'air':
      case 'water':
        signs = rashiValues.filter(rv => rv.element === tail).map(rv => rv.num);
        break;
      case 'movable':
      case 'fixed':
        signs = rashiValues
          .filter(rv => rv.mobility === tail)
          .map(rv => rv.num);
        break;
      case 'head_rising':
      case 'back_rising':
      case 'both_rising':
        const risingBase = tail.split('_').shift();
        const risingKeys =
          risingBase === 'both' ? ['head', 'back'] : [risingBase];
        signs = rashiValues
          .filter(rv => risingKeys.every(rk => rv.rising.includes(rk)))
          .map(rv => rv.num);
        break;
    }
  }
  return signs;
};

export class PairedChart {
  _id?: string;
  user: string;
  c1: Chart;
  c2: Chart;
  timespace: Chart;
  surfaceGeo: GeoLoc;
  surfaceAscendant: number;
  surfaceTzOffset: number;
  midMode = 'midpoint';
  relType = '';
  tags: Tag[];
  startYear = -1;
  endYear = -1;
  span = 0;
  notes = '';
  aspects: KeyPairVal[] = [];
  kutas: KutaValSet[] = [];
  createdAt: Date;
  modifiedAt: Date;
  ayanamshaNum = 27;
  private kutaSet: Map<string, any> = new Map();

  constructor(inData = null) {
    if (inData instanceof Object) {
      let timespace = null;
      this.aspects = [];
      Object.entries(inData).forEach(entry => {
        const [key, val] = entry;

        if (val instanceof Array) {
          switch (key) {
            case 'tags':
              this.tags = val.map(tg => new Tag(tg));
              break;

            case 'aspects':
              this.aspects = val.map(asp => {
                const { k1, k2, value } = asp;
                return {
                  k1,
                  k2,
                  value,
                };
              });
              break;
            case 'kutas':
              this.kutas = val.map(kt => {
                const { k1, k2, values } = kt;
                return {
                  k1,
                  k2,
                  values,
                };
              });
              break;
          }
        } else if (val instanceof Object) {
          switch (key) {
            case 'c1':
            case 'c2':
              this[key] = new Chart({ ...val });
              break;
            case 'timespace':
              timespace = val;
              break;
            case 'surfaceGeo':
              this[key] = new GeoLoc(val);
              break;
          }
        } else if (typeof val === 'number') {
          switch (key) {
            case 'surfaceAscendant':
            case 'surfaceTzOffset':
            case 'startYear':
            case 'endYear':
            case 'span':
              this[key] = val;
              break;
            case 'yearLength':
              this.span = val;
              break;
          }
        } else if (typeof val === 'string') {
          switch (key) {
            case 'notes':
            case 'midMode':
            case 'relType':
            case '_id':
              this[key] = val;
              break;
            case 'createdAt':
            case 'modifiedAt':
              this[key] = new Date(val);
              break;
          }
        }
      });
      if (timespace instanceof Object) {
        this.timespace = new Chart(timespace, this.surfaceGeo);
      }
    }
  }

  get locations() {
    const places = [this.c1.corePlacenames, this.c2.corePlacenames];
    const locations = [this.c1.geo, this.c2.geo];
    return locations.map((loc, index) => {
      return {
        ...loc,
        place: places[index],
      };
    });
  }

  get info() {
    return {
      jds: [this.c1.jd, this.c2.jd],
      tzOffsets: [this.c1.tzOffset, this.c2.tzOffset],
      midJd: this.midJd,
      locations: this.locations,
      midGeo: this.midGeo,
      tags: this.tags,
      startYear: this.startYear,
      endYear: this.endYear,
      span: this.span,
      relType: this.relType,
      subjects: [this.c1.subject, this.c2.subject],
    };
  }

  get midJd() {
    return (this.c1.jd + this.c2.jd) / 2;
  }

  get midGeo() {
    return {
      lat: (this.c1.geo.lat + this.c2.geo.lat) / 2,
      lng: (this.c1.geo.lng + this.c2.geo.lng) / 2,
      alt: (this.c1.geo.alt + this.c2.geo.alt) / 2,
    };
  }

  setAyanamshaNum(num: number) {
    this.ayanamshaNum = num;
  }

  matchRuleSet(
    rs: RuleSet,
    protocol: Protocol,
    kutaSet: Map<string, any> = new Map(),
  ) {
    const protoRs = new ProtocolResultSet(
      rs.name,
      rs.scores,
      rs.conditionSet.operator,
      rs.conditionSet.min,
    );
    if (kutaSet instanceof Map && kutaSet.size > 0) {
      this.kutaSet = kutaSet;
    }
    this.matchConditionSet(rs.conditionSet, protocol, protoRs);
    return protoRs;
  }

  get hasFemale() {
    return this.c1.subject.gender === 'f' || this.c2.subject.gender === 'f';
  }

  get hasMale() {
    return this.c1.subject.gender === 'm' || this.c2.subject.gender === 'm';
  }

  mayApplyCondition(condition: Condition) {
    switch (condition.fromMode) {
      case 'single':
        switch (condition.toMode) {
          case 'female':
            return this.hasFemale;
          case 'male':
            return this.hasMale;
          default:
            return true;
        }
      case 'female':
        return this.hasFemale;
      case 'male':
        return this.hasMale;
      default:
        return true;
    }
  }

  matchConditionSet(
    conditionSet: ConditionSet,
    protocol: Protocol,
    rs: ProtocolResultSet,
  ) {
    const bs = new BooleanSet(conditionSet.operator, conditionSet.min);
    conditionSet.conditionRefs.forEach(cond => {
      if (!cond.isSet && cond instanceof Condition) {
        if (this.mayApplyCondition(cond)) {
          const matched = this.matchCondition(cond, protocol);
          bs.addMatch(cond, matched);
        }
      } else if (cond instanceof ConditionSet) {
        const matched = this.matchConditionSet(cond, protocol, rs);
        bs.addMatch(cond, matched);
      }
    });
    rs.addBooleanSet(bs);
    return bs.matched;
  }

  matchAspectCondition(
    protocol: Protocol,
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
    k1: string,
    k2: string,
  ) {
    const { aspectValue, aspectMatched } = this.matchAspectItem(
      condition,
      fromChart,
      toChart,
      k1,
      k2,
    );
    const aspectMatches = condition.matchedAspects.map(aspectKey => {
      let aspected = false;
      if (aspectMatched) {
        //const [minVal, maxVal] = protocol.matchRange(aspectKey, k1, k2);
        const ranges = matchAspectRanges(aspectKey, k1, k2, protocol.orbs);

        const isApplying = condition.isNeutral
          ? true
          : calcAspectIsApplying(fromChart.graha(k1), fromChart.graha(k2));
        const applyModeMatched = condition.isSeparating
          ? !isApplying
          : isApplying;

        aspected = ranges.some(range => {
          const [minVal, maxVal] = range;
          const spansZero = minVal > 270 && minVal > maxVal && maxVal < 90;
          const inRange = spansZero
            ? aspectValue >= minVal || aspectValue <= maxVal
            : aspectValue >= minVal && aspectValue <= maxVal;
          return inRange && applyModeMatched;
        });
      }
      return aspected;
    });
    return aspectMatches.some(matched => matched);
  }

  matchDeclinationCondition(
    protocol: Protocol,
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
    k1: string,
    k2: string,
  ) {
    const orbRef = condition.orb > 0 ? condition.orb : -1;
    const orb = protocol.matchOrbValue(condition.context, k1, k2, orbRef);
    const { parallel, incontraParallel } = this.matchDeclination(
      fromChart.graha(k1),
      toChart.graha(k2),
      orb,
    );
    switch (condition.context) {
      case 'decl_parallel':
        return parallel === true;
      case 'incontra_parallel':
        return incontraParallel === true;
      default:
        return false;
    }
  }

  matchKutaCondition(
    protocol: Protocol,
    condition: Condition,
    k1: string,
    k2: string,
    reverse = false,
  ) {
    const kutaVal = this.matchKuta(condition, k1, k2, reverse);
    const max = protocol.kutaMax(condition.contextType.kutaKey);
    const percent = max > 0 ? (kutaVal / max) * 100 : 0;
    return inRange(percent, condition.kutaRange);
  }

  matchDivisionalCondition(condition: Condition, fromChart: Chart, k1: string) {
    const keys1 = condition.matchesMultiple1 ? coreIndianGrahaKeys : [k1];
    const matches = keys1.map(key1 => {
      const graha = fromChart.graha(key1);
      let matched = false;
      if (condition.contextType.bySign) {
        matched = graha.signNum === condition.c2Num;
      } else if (condition.contextType.byHouse) {
        matched = graha.houseW === condition.c2Num;
      } else if (condition.contextType.byNakshatra) {
        matched = graha.nakshatra27Num === condition.c2Num;
      }
      return matched;
    });
    const numMatched = matches.filter(m => m).length;
    if (condition.matchesMultiple1) {
      return numMatched >= condition.c2Num;
    } else {
      return numMatched > 0;
    }
  }

  matchSameSignCondition(
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
    k1: string,
    k2: string,
  ) {
    const keys1 = condition.matchesMultiple1 ? coreIndianGrahaKeys : [k1];
    const matches = keys1.map(key1 => {
      const g1 = fromChart.graha(key1);
      const g2 = toChart.graha(k2);
      return g1.signNum === g2.signNum;
    });
    const numMatches = matches.filter(m => m).length;
    return condition.matchesMultiple1
      ? numMatches >= condition.c2Num
      : numMatches > 0;
  }

  /*

  */
  matchDrishtiCondition(
    protocol: Protocol,
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
    k1 = '',
    k2 = '',
  ) {
    const grKeys1 = matchBmGrahaKeys(k1, condition, fromChart);
    const grKeys2 = matchBmGrahaKeys(k2, condition, toChart);
    let matched = false;
    const bmRows: Array<BmMatchRow> = [];
    grKeys1.forEach(gk1 => {
      grKeys2.forEach(gk2 => {
        const gr1 = fromChart.graha(gk1);
        const gr2 = toChart.graha(gk2);
        if (gr1 instanceof Object && gr2 instanceof Object) {
          const sendsDiff = calcInclusiveSignPositions(
            gr1.signNum,
            gr2.signNum,
          );
          const applyRashi = condition.isRashiDrishti;
          // sends drishti
          const sendsVal = applyRashi
            ? protocol.matchRashiDrishti(gr1.signNum, sendsDiff)
            : protocol.matchDrishti(gk1, sendsDiff);
          const getsDiff = calcInclusiveSignPositions(gr2.signNum, gr1.signNum);
          // receives / gets drishti
          const getsVal = applyRashi
            ? protocol.matchRashiDrishti(gr1.signNum, getsDiff)
            : protocol.matchDrishti(gk2, getsDiff);
          bmRows.push({
            k1: gk1,
            sendsDiff,
            sendsVal,
            k2: gk2,
            getsDiff,
            getsVal,
          });
        }
      });
    });
    const keyParts = condition.contextType.key.split('_');
    const firstPart = keyParts[0];
    const numVal = isNumeric(firstPart) ? parseInt(firstPart) : -1;
    switch (firstPart) {
      case 'any':
        matched = bmRows.some(row => filterBmMatchRow(row, condition));
        break;
      case 'all':
        matched = bmRows.every(row => filterBmMatchRow(row, condition));
        break;
      default:
        matched =
          bmRows.filter(row => filterBmMatchRow(row, condition)).length ===
          numVal;
        break;
    }
    return matched;
  }

  matchPanangaType(chart: Chart, objType: ObjectType) {
    switch (objType.panchangaType) {
      case 'tithi':
        return objType.matchTithiRange(chart.tithi.value);
      case 'yoga':
        return chart.yoga.num === objType.numValue;
      case 'vara':
        return chart.vara.num === objType.numValue;
      case 'karana':
        return chart.karana.num === objType.numValue;
    }
  }

  matchPanchangaCondition(
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
  ) {
    let matched = this.matchPanangaType(fromChart, condition.object1);
    if (!condition.singleMode && matched) {
      matched = this.matchPanangaType(toChart, condition.object2);
    }
    return matched;
  }

  matchYogaKartariCondition(
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
    k1 = '',
  ) {
    const grKeys1 = matchBmGrahaKeys(k1, condition, fromChart);

    const bmMatches = [];
    const isFunctional = condition.isFunctional;
    const bm = this.funcBmMap(toChart, isFunctional);
    const beneficKeys = isFunctional ? bm.get('b') : naturalBenefics;
    const maleficKeys = isFunctional ? bm.get('m') : naturalMalefics;

    grKeys1.forEach(gk1 => {
      const signNum = fromChart.graha(gk1).signNum;
      const nextSign = signNum + 1 > 12 ? 1 : signNum + 1;
      const prevSign = signNum - 1 < 1 ? 12 : signNum - 1;
      coreIndianGrahaKeys.forEach(key => {
        const signNum = toChart.graha(key).signNum;
        if (signNum === prevSign || signNum === nextSign) {
          bmMatches.push({
            key,
            b: beneficKeys.includes(key),
            m: maleficKeys.includes(key),
            isNext: signNum === nextSign,
          });
        }
      });
    });
    const matchKartariYoga = (nature = 'b') =>
      bmMatches.filter(bm => bm.isNext && bm[nature]).length >= 1 &&
      bmMatches.filter(bm => !bm.isNext && bm[nature]).length >= 1;
    let matched = false;
    switch (condition.contextType.key) {
      case 'shubha_kartari_yoga':
        matched = matchKartariYoga('b');
        break;
      case 'papa_kartari_yoga':
        matched = matchKartariYoga('m');
        break;
    }
    return matched;
  }

  funcBmMap(chart: Chart, build = true): Map<string, Array<string>> {
    return funcBmMap(chart, build);
  }

  matchYutiCondition(condition: Condition, fromChart: Chart, toChart: Chart) {
    const grKeys = coreIndianGrahaKeys;
    const yutiMatches = [];
    grKeys.forEach(gk1 => {
      grKeys.forEach(gk2 => {
        const shouldCheck = condition.singleMode ? gk1 !== gk2 : true;
        if (shouldCheck) {
          const gr1 = fromChart.graha(gk1);
          const gr2 = toChart.graha(gk2);
          const angle = relativeAngle(gr1.longitude, gr2.longitude);
          // always within orb of 1º
          const aspected = angle >= -1 && angle <= 1;
          if (aspected) {
            yutiMatches.push({
              k1: gk1,
              k2: gk2,
              aspected,
            });
          }
        }
      });
    });
    return yutiMatches.length > 1;
  }

  matchAspectItem(
    condition: Condition,
    fromChart: Chart,
    toChart: Chart,
    k1: string,
    k2: string,
  ) {
    let aspectValue = 0;
    let aspectMatched = false;

    if (
      condition.usesMidChart ||
      !this.aspectIsInPaired(condition.object1, condition.object2, k1, k2)
    ) {
      const val1 = fromChart.matchObjectValue(condition.object1, k1);
      const val2 = toChart.matchObjectValue(condition.object2, k2);
      aspectValue = relativeAngle(val1, val2);
      aspectMatched = true;
    } else {
      if (condition.compareGrahas) {
        const reverse = fromChart._id !== this.c1._id;
        aspectMatched = this.aspects.length > 0;
        if (aspectMatched) {
          aspectValue = this.matchAspects(k1, k2, reverse);
        }
      }
    }
    return { aspectValue, aspectMatched };
  }

  matchGrahaEquivalent(obj: ObjectType, chart: Chart) {
    return matchGrahaEquivalent(obj, chart, this.ayanamshaNum);
  }

  matchCondition(condition: Condition, protocol: Protocol) {
    let matched = false;

    const fromChart = condition.singleMode
      ? this.matchChart(condition.toMode)
      : this.matchChart(condition.fromMode);

    const toChart = this.matchChart(condition.toMode);
    const ayanamshaNum = protocol.ayanamshaNum;
    fromChart.setAyanamshaItemByNum(ayanamshaNum);
    toChart.setAyanamshaItemByNum(ayanamshaNum);
    const obj1 = condition.object1;
    const obj2 = condition.object2;
    // handle lordRev here using obj1.isLordship and condition.lordDev
    const k1 = this.matchGrahaEquivalent(obj1, fromChart);
    const baseChart2 = condition.fromFirstHouseStructure ? fromChart : toChart;
    const k2 = this.matchGrahaEquivalent(obj2, baseChart2);
    if (condition.isLongAspect) {
      const keys1 = condition.matchesMultiple1 ? coreIndianGrahaKeys : [k1];
      const keys2 = condition.matchesMultiple2 ? coreIndianGrahaKeys : [k2];
      const aspectedGrid = keys1.map(key1 => {
        return keys2.map(key2 => {
          const aspected = this.matchAspectCondition(
            protocol,
            condition,
            fromChart,
            toChart,
            key1,
            key2,
          );
          return {
            aspected,
            k1: key1,
            k2: key2,
          };
        });
      });
      if (aspectedGrid.length > 0) {
        const c1ToC2Matches = aspectedGrid.map(
          aspSet => aspSet.filter(aspItem => aspItem.aspected).length,
        );
        if (condition.matchesMultiple1) {
          matched =
            c1ToC2Matches.filter(num => num > 0).length >= condition.c1Num;
        } else {
          matched = c1ToC2Matches.some(num => num > 0);
        }
      }
    } else if (condition.isDignityBala) {
      matched = this.matchDignityBala(condition, fromChart, k1);
    } else if (condition.isDeclination) {
      matched = this.matchDeclinationCondition(
        protocol,
        condition,
        fromChart,
        toChart,
        k1,
        k2,
      );
    } else if (condition.contextType.isKuta) {
      const reverse = fromChart._id !== this.c1._id;
      matched = this.matchKutaCondition(protocol, condition, k1, k2, reverse);
    } else if (condition.contextType.isDivisional) {
      matched = this.matchDivisionalCondition(condition, fromChart, k1);
    } else if (condition.sameSign) {
      matched = this.matchSameSignCondition(
        condition,
        fromChart,
        toChart,
        k1,
        k2,
      );
    } else if (condition.isYuti) {
      matched = this.matchYutiCondition(condition, fromChart, toChart);
    } else if (condition.isKartariYoga) {
      matched = this.matchYogaKartariCondition(
        condition,
        fromChart,
        toChart,
        k1,
      );
    } else if (condition.isDrishtiAspect) {
      matched = this.matchDrishtiCondition(
        protocol,
        condition,
        fromChart,
        toChart,
        k1,
        k2,
      );
    } else if (condition.object1.isPanchanga) {
      matched = this.matchPanchangaCondition(condition, fromChart, toChart);
    }
    // If isTrue is false, matched state is inverted
    return matched === condition.isTrue;
  }

  matchKuta(condition: Condition, ref1: string, ref2: string, reverse = false) {
    const [k1, k2] = reverse ? [ref2, ref1] : [ref1, ref2];
    const { kutaKey } = condition.contextType;
    const matchedKutaRow = this.kutas.find(ks => ks.k1 === k1 && ks.k2 === k2);
    let val = 0;
    if (condition.usesMidChart) {
      const fromChart = this.matchChart(condition.fromMode);
      const toChart = this.matchChart(condition.toMode);
      const kutaBuilder = new Kuta(fromChart, toChart);
      kutaBuilder.loadCompatibility(this.kutaSet);
      const kutaResult = kutaBuilder.calcSingleKuta(
        condition.contextType.kutaKey,
        fromChart.graha(k1),
        toChart.graha(k2),
      );
      val = kutaResult.score;
    } else {
      if (matchedKutaRow instanceof Object) {
        const kutaValRow = matchedKutaRow.values.find(kv => kv.key === kutaKey);
        if (kutaValRow instanceof Object) {
          val = kutaValRow.value;
        }
      }
    }
    return val;
  }

  aspectIsInPaired(obj1: ObjectType, obj2: ObjectType, k1 = '', k2 = '') {
    if (obj1.type === 'graha' || obj2.type === 'graha') {
      const g1 = k1.length === 2 ? k1 : obj1.key;
      const g2 = k2.length === 2 ? k2 : obj2.key;
      const keys = indianGrahaAndPointKeys;
      return keys.includes(g1) && keys.includes(g2);
    } else {
      return false;
    }
  }

  matchAspects(ref1: string, ref2: string, reverse = false) {
    const [k1, k2] = reverse ? [ref2, ref1] : [ref1, ref2];
    const asp = this.aspects.find(asp => asp.k1 === k1 && asp.k2 === k2);
    return asp instanceof Object ? asp.value : 0;
  }

  matchDeclination(g1: Graha, g2: Graha, orb: number) {
    const sameSide =
      (g1.declination >= 0 && g2.declination >= 0) ||
      (g1.declination < 0 && g2.declination < 0);
    const range = [
      Math.abs(g1.declination) - orb,
      Math.abs(g1.declination) + orb,
    ];
    const withinOrb = inRange(Math.abs(g1.declination), range);
    const parallel = sameSide && withinOrb;
    const incontraParallel = !sameSide && withinOrb;
    const distance = Math.abs(g1.declination - g2.declination);
    return {
      sameSide,
      parallel,
      incontraParallel,
      distance,
    };
  }

  matchDignityBala(condition: Condition, fromChart: Chart, k1: string) {
    const fromObj = fromChart.graha(k1);
    const filterKey = condition.object2.key;
    return this.matchDignityKey(fromObj, filterKey);
  }

  matchDignityKey(fromObj: Graha, filterKey: string) {
    const { relationship } = fromObj.variant;
    switch (filterKey) {
      case 'exalted_sign':
        return fromObj.isExalted;
      case 'mula_trikona':
        return fromObj.isMulaTrikon;
      case 'own_sign':
        return fromObj.isOwnSign;
      case 'greatfriend_sign':
        return relationship === 'bestFriend';
      case 'friend_sign':
        return relationship === 'friend';
      case 'neutral_sign':
        return relationship === 'neutral';
      case 'enemy_sign':
        return relationship == 'enemy';
      case 'archenemy_sign':
        return relationship === 'archEnemy';
      case 'directional_strength':
        return fromObj.hasDirectionalStrength;
      case 'retrograde':
        return fromObj.lngSpeed < 0;
      case 'vargottama':
        return fromObj.vargottama;
    }
  }

  matchChart(key = 'female') {
    switch (key) {
      case 'c1':
        return this.c1;
      case 'c2':
        return this.c2;
      case 'female':
      case 'f':
        return this.femaleChart;
      case 'male':
      case 'm':
        return this.maleChart;
      case 'midpoint':
        return this.midpoint;
      case 'timespace':
        return this.timespace;
      default:
        return new Chart(null);
    }
  }

  get maleChart() {
    return this.c1.gender === 'm' ? this.c1 : this.c2;
  }

  get femaleChart() {
    return this.c1.gender === 'f' ? this.c1 : this.c2;
  }

  get midpoint() {
    return combineCharts(this.c1, this.c2, this.ayanamshaNum);
  }
}

export const buildGraha = (
  key = '',
  lng = 0,
  ayanamshaItem: AyanamshaItem,
  lagna = 0,
): Graha => {
  const gr = matchReference(key, { lng });
  gr.setAyanamshaItem(ayanamshaItem);
  const hi = subtractSign(calcSign(gr.longitude), calcSign(lagna));
  gr.variants = [
    {
      num: ayanamshaItem.num,
      house: hi + 1,
      sign: calcSign(gr.longitude),
      nakshatra: Math.floor(gr.longitude / 27) + 1,
      relationship: '',
      charaKaraka: 0,
    },
  ];
  return gr;
};

export const simpleSetToFullChart = (
  jd = 0,
  geo = null,
  inData: any = null,
  ayamansha = 24,
  name = '',
  gender = '-',
  ayanamshaKey = 'true_citra',
) => {
  const mp: Map<string, any> = new Map();
  const ayanamshaItem = {
    key: ayanamshaKey,
    value: ayamansha,
    num: matchAyanamshaNum(ayanamshaKey),
    name: ayanamshaKey,
  };
  mp.set('jd', jd);
  mp.set('geo', geo);
  mp.set('subject', {
    ...emptySubject,
    name,
    gender,
  });
  mp.set('ayanamshas', [
    {
      key: ayanamshaKey,
      value: ayamansha,
    },
  ]);
  if (inData instanceof Object) {
    const hasAsc = Object.keys(inData).includes('as');
    const asLng = hasAsc ? inData.as : 0;
    mp.set('ascendant', asLng);
    const lagna = subtractLng360(asLng, ayamansha);
    const grahas: Graha[] = [];
    if (hasAsc) {
      Object.entries(inData).map(([k, v]) => {
        if (['as', 'ds'].includes(k) === false && typeof v === 'number') {
          const gr = buildGraha(k, v, ayanamshaItem, lagna);
          grahas.push(gr);
        }
      });
      mp.set('grahas', grahas);
    }
  }
  const chart = new Chart(Object.fromEntries(mp.entries()));
  chart.setAyanamshaItem(ayanamshaItem);
  return chart;
};

export const basicSetToFullChart = (
  simpleSet = null,
  ayanamshaKey = 'true_citra',
) => {
  if (simpleSet instanceof Object) {
    const { jd, geo, birth, ayanamsha, name, gender } = simpleSet;
    if (
      typeof jd === 'number' &&
      geo instanceof Object &&
      birth instanceof Object
    ) {
      return simpleSetToFullChart(
        jd,
        geo,
        birth,
        ayanamsha,
        name,
        gender,
        ayanamshaKey,
      );
    }
  }
  return new Chart(null);
};

export const generateBasicChart = async (
  dt = '',
  loc,
  name = '',
  gender = '-',
  ayanamshaKey = 'true_citra',
) => {
  const geo = locStringToGeo(loc);
  const { jd } = matchJdAndDatetime(dt);
  const ayanamsha = await calcAyanamsha(jd, ayanamshaKey);
  const bd = await calcAllBodyLngsJd(jd, 'core');
  const hd1 = await fetchHouseDataJd(jd, geo, 'W');
  bd.bodies.push({ key: 'as', lng: hd1.ascendant });
  const bodyData = keyValuesToSimpleObject(bd.bodies, 'lng');
  return simpleSetToFullChart(
    jd,
    geo,
    bodyData,
    ayanamsha,
    name,
    gender,
    ayanamshaKey,
  );
};



export const extractPanchangaData = (chart: Chart): Map<string, any> => {
  chart.setAyanamshaItemByKey('true_citra');
  const pd: Map<string, any> = new Map();
  const vara = chart.vara;
  const term1 = matchPanchangaTerm('vara', vara.num);
  pd.set('vara', {
    num: vara.num,
    ruler: vara.ruler,
    ...term1
  })
  /*   karana: chart.karana,
    tithi: chart.tithi,
    yoga: chart.yoga,
    nakshatra: chart.nakshatra */
  const karana = chart.karana;
  const term2 = matchPanchangaTerm('karana', karana.num);
  pd.set('karana', {
    num: karana.num,
    ruler: karana.ruler,
    percent: karana.percent,
    ...term2
  });

  const tithi = chart.tithi;
  const term3 = matchPanchangaTerm('tithi', tithi.num);
  pd.set('tithi', {
    num: tithi.num,
    ruler: tithi.lord,
    percent: tithi.percent,
    ...term3
  });
  const yoga = chart.yoga;
  const term4 = matchPanchangaTerm('yoga', yoga.num);
  pd.set('yoga', {
    num: yoga.num,
    ruler: yoga.ruler,
    percent: tithi.percent,
    ...term4
  })

  const nakshatra = chart.moon.nakshatra;
  const term5 = matchPanchangaTerm('nakshatra', nakshatra.num);
  pd.set('nakshatra', {
    num: nakshatra.num,
    ruler: nakshatra.ruler,
    percent: nakshatra.percent,
    ...term5
  })

  return pd;
}
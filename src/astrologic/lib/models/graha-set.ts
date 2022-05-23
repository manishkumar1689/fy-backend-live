import { isNumeric, notEmptyString, inRange } from '../../../lib/validators';
import { BaseObject } from './base-object';
import { mapToObject } from '../mappers';
import {
  mapSignToHouse,
  calcAllVargas,
  calcVargaValue,
  calcVargaSet,
  matchHouseNum,
} from '../math-funcs';
import { matchNakshatra } from '../core';
import { TransitionData } from '../transitions';
import nakshatraValues from '../settings/nakshatra-values';
import charakarakaValues from '../settings/charakaraka-values';
import grahaValues, { directionalStrengthMap } from '../settings/graha-values';
import refValues from '../settings/ref-values';
import { Nakshatra } from './nakshatra';
import { Relationship } from './relationship';
import { GeoPos } from '../../interfaces/geo-pos';
import { BodyTransition } from '../../interfaces/body-transition';
import { HouseSet } from './house-set';
import {
  degToSign,
  nakshatra27,
  nakshatra28,
  subtractLng360,
  withinNakshatra27,
  nakshatra28Progress,
} from '../helpers';
import { AyanamshaItem, DefaultAyanamshaItem, KeyLng } from '../interfaces';
import { mapRelationships } from '../map-relationships';

interface VariantGroup {
  num: number;
  sign?: number;
  house: number;
  nakshatra: number;
  relationship: string;
  charaKaraka: number;
}

const defaultVariant = {
  num: 0,
  sign: -1,
  house: -1,
  nakshatra: 0,
  relationship: '',
  charaKaraka: 0,
};

export class Graha extends BaseObject {
  num = -1;
  name = '';
  key = '';
  ref = '';
  altRef = '';
  jyNum = -1;
  icon = '';
  bhuta = '';
  guna = '';
  caste = '';
  dhatu = '';
  dosha = '';
  lng = 0;
  lat = 0;
  topo: GeoPos = {
    lng: 0,
    lat: 0,
  };
  distance = 1;
  declination?: number = null;
  rectAscension?: number = null;
  lngSpeed = 0;
  latSpeed = 0;
  dstSpeed = 0;
  calc = '';
  friends = [];
  neutral = [];
  enemies = [];
  relationship = new Relationship();
  mulaTrikon: -1;
  mulaTrikonDegrees: [];
  exaltedDegree = 0;
  ownSign = [];
  charaKarakaMode = 'standard';
  charaKaraka = 0;
  ckNum = 0;
  house = 0;
  ownHouses = [];
  ayanamshaItem = DefaultAyanamshaItem;
  vargaNum = 1;
  transitions: Array<BodyTransition> = [];
  variants?: Array<VariantGroup> = [];

  constructor(body: any = null) {
    super();
    if (body instanceof Object) {
      const row = grahaValues.find(g => g.key === body.key);
      const obj = row instanceof Object ? { ...row, ...body } : body;
      Object.entries(obj).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'longitude':
          case 'lon':
          case 'lng':
            if (typeof value === 'number') {
              this.lng = value;
            }
            break;
          case 'latitude':
          case 'lat':
            if (typeof value === 'number') {
              this.lat = value;
            }
            break;
          case 'longitudeSpeed':
            if (typeof value === 'number') {
              this.lngSpeed = value;
            }
            break;
          case 'latitudeSpeed':
            if (typeof value === 'number') {
              this.latSpeed = value;
            }
            break;
          case 'distanceSpeed':
            if (typeof value === 'number') {
              this.dstSpeed = value;
            }
            break;
          case 'sign':
          case 'nakshatra':
            break;
          default:
            this[key] = value;
            break;
        }
      });
    }
  }

  get variant() {
    const row = this.variants.find(row => row.num === this.ayanamshaItem.num);
    return row instanceof Object ? row : defaultVariant;
  }

  get sign() {
    return Math.floor(this.longitude / 30) + 1;
  }

  get signIndex() {
    return Math.floor(this.longitude / 30);
  }

  get motion() {
    const grahaRow = grahaValues.find(gv => gv.key === this.key);
    const refSpeed = grahaRow instanceof Object && Object.keys(grahaRow).includes("fastSpd")? grahaRow.fastSpd : -1;
    return this.lngSpeed >= 0 ? refSpeed > 0 && this.lngSpeed > refSpeed ? 'fast' : 'normal' : 'retro';
  }

  get signNum() {
    return this.signIndex + 1;
  }

  get nakshatra27Num() {
    return Math.floor(this.longitude / (360 / 27)) + 1;
  }

  get houseW() {
    const row = this.variants.find(row => row.num === this.ayanamshaItem.num);
    if (row instanceof Object) {
      return row.house;
    } else {
      return -1;
    }
  }

  get nakshatra(): Nakshatra {
    return new Nakshatra(matchNakshatra(this.longitude));
  }

  get ayanamshaValue() {
    if (this.ayanamshaItem instanceof Object) {
      const { value } = this.ayanamshaItem;
      if (isNumeric(value)) {
        return value;
      }
    }
    return 0;
  }

  get longitude(): number {
    return calcVargaValue(
      subtractLng360(this.lng, this.ayanamshaValue),
      this.vargaNum,
    );
  }

  get vargottama(): boolean {
    const adjustedLng = subtractLng360(this.lng, this.ayanamshaValue);
    const lngD1 = calcVargaValue(adjustedLng, 1);
    const lngD9 = calcVargaValue(adjustedLng, 9);
    return degToSign(lngD1) === degToSign(lngD9);
  }

  get vargottamaSign(): number {
    const adjustedLng = subtractLng360(this.lng, this.ayanamshaValue);
    const lngD9 = calcVargaValue(adjustedLng, 9);
    return degToSign(lngD9);
  }

  get retrograde(): boolean {
    return this.lngSpeed < 0;
  }

  get hasDirectionalStrength(): boolean {
    if (Object.keys(directionalStrengthMap).includes(this.key)) {
      return directionalStrengthMap[this.key] === this.variant.house;
    } else {
      return false;
    }
  }

  directionalStrengthSign(firstSignNum = 1): number {
    if (Object.keys(directionalStrengthMap).includes(this.key)) {
      const house = directionalStrengthMap[this.key];
      return house - 1 + ((firstSignNum - 1) % 12) + 1;
    } else {
      return 0;
    }
  }

  get latitude() {
    return this.lat;
  }

  get longitudeSpeed() {
    return this.lngSpeed;
  }

  get latitudeSpeed() {
    return this.latSpeed;
  }

  get distanceSpeed() {
    return this.dstSpeed;
  }

  get nakshatraDegrees() {
    return 360 / nakshatraValues.length;
  }

  get nakshatra27() {
    return nakshatra27(this.longitude);
  }

  get withinNakshatra27() {
    return withinNakshatra27(this.longitude);
  }

  get nakshatra28() {
    return nakshatra28(this.longitude);
  }

  get nakshatra28Progress() {
    return nakshatra28Progress(this.longitude);
  }

  get padaDegrees() {
    return this.nakshatraDegrees / 4;
  }

  get ruler(): string {
    let str = '';
    const rk = grahaValues.find(b => b.ownSign.includes(this.sign));
    if (rk) {
      str = rk.key;
    }
    return str;
  }

  get natural(): string {
    let natural = '';
    if (this.ruler.length > 1) {
      if (this.friends.includes(this.ruler)) {
        natural = 'friend';
      } else if (this.neutral.includes(this.ruler)) {
        natural = 'neutral';
      } else if (this.enemies.includes(this.ruler)) {
        natural = 'enemy';
      }
    }
    return natural;
  }

  /*
Calculate pachanga values for a body 
@parma body:Object
*/
  get padaFrac() {
    return this.nakshatra.within / this.padaDegrees;
  }

  get padaIndex() {
    return Math.floor(this.padaFrac);
  }

  get padaNum() {
    return this.padaIndex + 1;
  }

  get percent() {
    return this.padaFrac * 25;
  }

  get akshara() {
    return this.nakshatra.aksharas[this.padaIndex];
  }

  get withinSign() {
    return this.lng % 30;
  }
  get isOwnSign(): boolean {
    return this.ownSign.indexOf(this.sign) >= 0;
  }
  get isMulaTrikon(): boolean {
    return (
      this.sign === this.mulaTrikon &&
      inRange(this.withinSign, this.mulaTrikonDegrees)
    );
  }

  get exalted() {
    return Math.floor(this.exaltedDegree / 30) + 1;
  }

  get debilitatedDegree() {
    return (this.exaltedDegree + 180) % 360;
  }

  get debilitated() {
    return Math.floor(this.debilitatedDegree / 30) + 1;
  }

  get isExalted(): boolean {
    return (
      this.sign === this.exalted &&
      inRange(this.withinSign, [0, (this.exaltedDegree % 30) + 1])
    );
  }

  get isDebilitated(): boolean {
    return (
      this.sign === this.debilitated &&
      inRange(this.withinSign, [0, (this.exaltedDegree % 30) + 1])
    );
  }

  setTransitions(transitions: Array<BodyTransition> = []) {
    this.transitions = transitions;
  }

  calcVargas() {
    return calcAllVargas(this.lng);
  }

  setAyanamshaItem(ayanamshaItem: AyanamshaItem) {
    this.ayanamshaItem = ayanamshaItem;
  }

  toKeyLng(): KeyLng {
    return {
      key: this.key,
      lng: this.longitude
    }
  }

  setVarga(num = 1) {
    this.vargaNum = num;
  }

  hasRuler = () => notEmptyString(this.ruler, 1);
}

/*
Set of grahas with extra methods to add houses and other attributes that require comparisons with other grahas
*/
export class GrahaSet {
  jd = null;
  bodies: Array<Graha> = [];

  constructor(bodyData: any = null) {
    if (bodyData instanceof Object) {
      const { jd, bodies } = bodyData;
      if (jd) {
        this.jd = parseFloat(jd);
      }
      if (bodies instanceof Array) {
        this.bodies = bodies.map(b => new Graha(b));
        this.bodies.sort((a, b) => a.jyNum - b.jyNum);
      }
    }
  }

  get(key: any): Graha {
    let matchFunc = b => false;
    if (isNumeric(key)) {
      matchFunc = b => b.num === parseInt(key);
    } else if (notEmptyString(key, 2)) {
      if (key.length === 2) {
        matchFunc = b => b.key === key;
      } else {
        matchFunc = b => b.name.toLowerCase() === key.toLowerCase;
      }
    }
    const body = this.bodies.find(matchFunc);
    if (body) {
      return body;
    } else {
      return new Graha();
    }
  }

  mergeHouseData(houseData: HouseSet, corrected = false) {
    this.bodies = this.bodies.map(b => {
      const grLng = corrected ? b.lng : b.longitude;
      b.house = matchHouseNum(grLng, houseData.houses);
      if (b.mulaTrikon) {
        if (b.ownSign.indexOf(b.mulaTrikon) > 0) {
          b.ownSign.reverse();
        }
      }
      b.ownHouses = b.ownSign.map(sign =>
        mapSignToHouse(sign, houseData.houses),
      );
      return b;
    });
    return this;
  }

  getBodies = () => this.bodies;

  getRuler(key: string) {
    const body = this.get(key);
    let rulerKey = '';
    if (body) {
      rulerKey = body.ruler;
    }
    return this.get(rulerKey);
  }

  sun = () => this.get('su');

  moon = () => this.get('mo');

  mercury = () => this.get('me');

  venus = () => this.get('ve');

  mars = () => this.get('ma');

  jupiter = () => this.get('ju');

  saturn = () => this.get('sa');

  ketu = () => this.get('ke');

  rahu = () => this.get('ra');

  matchValues() {
    this.matchRelationships();
    this.applyCharaKarakas();
  }

  longitudes() {
    const map: Map<string, number> = new Map();
    this.bodies.forEach(b => {
      map.set(b.key, b.lng);
    });
    return mapToObject(map);
  }

  matchLng = (key: any, retVal = -1) => {
    const body = this.get(key);
    if (body) {
      return body.longitude;
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

  getVargaSet() {
    return this.bodies.map(b => calcVargaSet(b.lng, b.num, b.key));
  }

  getFullVargaSet(lagnaLng: number) {
    const lagnaVarga = calcVargaSet(lagnaLng, -1, 'as');
    const vargas = this.getVargaSet();
    return [lagnaVarga, ...vargas];
  }

  mergeTransitions(transitionSets: Array<TransitionData> = []) {
    const keys = ['set', 'rise', 'mc', 'ic'];
    transitionSets.forEach(trSet => {
      const trKeys = Object.keys(trSet);
      const trs = keys
        .filter(k => trKeys.includes(k))
        .map(key => {
          const trRow = trSet[key];
          const { jd, dt } = trRow;
          return { type: key, jd, datetime: dt };
        });
      this.get(trSet.num).setTransitions(trs);
    });
  }

  mergeSunTransitions(transitions: Array<BodyTransition>) {
    const sun = this.sun();
    const currKeys = sun.transitions.map(tr => tr.type);
    transitions.forEach(bt => {
      if (!currKeys.includes(bt.type)) {
        sun.transitions.push(bt);
      }
    });
  }

  matchRelationships() {
    this.bodies = this.bodies.map(b => {
      b.relationship = mapRelationships(
        b.sign,
        this.get(b.ruler).sign,
        b.isOwnSign,
        b.natural,
      );
      return b;
    });
  }

  applyCharaKarakas() {
    if (this.bodies.some(b => isNumeric(b.withinSign))) {
      const withinSignBodies = this.calcCharaKaraka();
      this.mergeCharaKarakaToBodies(withinSignBodies);
    }
  }

  /*
  Add charaKara data
  @return Array<Object>
  */
  calcCharaKaraka() {
    const validModes = ['forward', 'reverse'];
    const withinSignBodies = this.bodies
      .filter(b => validModes.includes(b.charaKarakaMode))
      .map(b => {
        const deg =
          b.charaKarakaMode === 'reverse' ? 30 - b.withinSign : b.withinSign;
        return {
          key: b.key,
          deg,
        };
      });
    withinSignBodies.sort((a, b) => b.deg - a.deg);
    return withinSignBodies.map((b, index) => {
      const ck =
        index < charakarakaValues.length ? charakarakaValues[index] : '';
      const num = index + 1;
      return { ...b, ck, num };
    });
  }

  mergeCharaKarakaToBodies(withinSignBodies: Array<any>) {
    this.bodies = this.bodies.map(b => {
      const wb = withinSignBodies.find(sb => sb.key === b.key);
      if (wb) {
        b.charaKaraka = wb.num;
      }
      return b;
    });
  }
}

export const matchReference = (key: string, attrs: any): Graha => {
  let row: any = refValues.find(r => r.key === key);
  if (row instanceof Object && attrs instanceof Object) {
    row = refValues.find(r => r.key === key);
  } else {
    row = grahaValues.find(r => r.key === key);
  }
  if (row instanceof Object) {
    row = { ...row, ...attrs };
  }
  return new Graha(row);
};

export const coreIndianGrahaKeys = ['su', 'mo', 'me', 've', 'ma', 'ju', 'sa'];

export const extendedIndianGrahaKeys = [...coreIndianGrahaKeys, 'ra', 'ke'];

export const indianGrahaAndPointKeys = [...coreIndianGrahaKeys, 'as', 'ds'];

export const extendedIndianGrahaPointKeys = [
  ...extendedIndianGrahaKeys,
  'as',
  'ds',
];

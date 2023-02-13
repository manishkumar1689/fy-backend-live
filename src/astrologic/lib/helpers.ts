import { isNumeric, notEmptyString } from '../../lib/validators';
import vargaValues from './settings/varga-values';
import { zeroPad } from '../../lib/converters';
import { SignValue } from '../interfaces/sign-house';
import { NakshatraItem } from '../interfaces/nakshatra-item';
import { aspectGroups } from './settings/graha-values';
import { Graha } from './models/graha-set';
import { LngLat } from './interfaces';
import { Placename } from '../../user/interfaces/placename.interface';

export const extractString = (obj: any, key: string): string => {
  let str = '';
  if (obj instanceof Object) {
    if (notEmptyString(obj[key])) {
      str = obj[key];
    }
  }
  return str;
};

export const extractBool = (obj: any, key: string): boolean => {
  let val = false;
  if (obj instanceof Object) {
    if (obj[key]) {
      switch (typeof obj[key]) {
        case 'boolean':
          val = obj[key];
          break;
        case 'number':
          val = obj[key] > 0;
          break;
        case 'string':
          if (isNumeric(obj[key])) {
            val = parseInt(obj[key]) > 0;
          } else {
            switch (obj[key].toLowerCase()) {
              case 'true':
              case 'yes':
                val = true;
                break;
            }
          }
          break;
      }
    }
  }
  return val;
};

export const stripHtml = (val: string) => {
  let str = '';
  if (typeof val === 'string') {
    str = val.trim();
    if (/<\w+[^>]*?>/.test(str)) {
      str = str.replace(/<\/?\w+[^>]*?>/g, ' ').replace(/\s\s+/g, ' ');
    }
  }
  return str;
};

export const capitalize = (str: string) => {
  return str.substring(0, 1).toUpperCase() + str.substring(1);
};

export const toCamelCase = (str: string) => {
  return str
    .split(/[ _-]+/)
    .map((part, pi) => {
      return pi > 0
        ? [
            part.substring(0, 1).toUpperCase(),
            part.substring(1).toLowerCase(),
          ].join('')
        : part;
    })
    .join('');
};

export const extractKeyValue = (obj: any, key: string, defVal: any) => {
  let output = defVal;
  if (obj instanceof Object) {
    const matchedVals = Object.entries(obj)
      .filter(entry => entry[0] === key)
      .map(pair => pair[1]);
    if (matchedVals.length > 0) {
      output = matchedVals.shift();
    }
  }
  return output;
};

export const extractId = (obj: any): string => {
  let id = '';
  if (obj instanceof Object) {
    if (obj._id) {
      id = obj._id;
    }
  }
  return id;
};

export const hasObjectId = (obj: any) => {
  return extractId(obj).length > 3;
};

export const toWords = (val: any): string => {
  let str = '';
  if (typeof val === 'string') {
    str = val
      .replace(/_+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase();
  }
  return str;
};

export const buildWHousesFromAscendant = (ascendant: number): Array<number> => {
  const firstW = Math.floor(ascendant / 30) * 30;
  const houses = [];
  for (let i = 0; i < 12; i++) {
    houses.push((firstW + i * 30) % 360);
  }
  return houses;
};

export const calcSign = (lng: number) => {
  return Math.floor((lng % 360) / 30) + 1;
};

export const matchHouseNum = (lng: number, houses: Array<number>): number => {
  const len = houses.length;
  const minIndex = houses.indexOf(Math.min(...houses));
  const matchedIndex = houses.findIndex((deg, index) => {
    const nextIndex = (index + 1) % len;
    const next = houses[nextIndex];
    const end = next < deg ? next + 360 : next;
    const lngPlus = lng + 360;
    const refLng =
      next < deg && next > 0 && lngPlus < end && minIndex === nextIndex
        ? lngPlus
        : lng;
    return refLng > deg && refLng <= end;
  });
  return matchedIndex + 1;
};

export const mapSignToHouse = (sign: number, houses: Array<number>): number => {
  const numH = houses.length;
  let hn = 0;
  if (numH > 0) {
    const diff = houses[0] / 30;
    const hnr = (sign - diff) % numH;
    hn = hnr < 1 ? hnr + numH : hnr;
  }
  return hn;
};

export const calcAspectIsApplying = (gr1: Graha, gr2: Graha): boolean => {
  const firstFaster = gr1.lngSpeed > gr2.lngSpeed;
  const firstHigher = gr1.longitude > gr2.longitude;
  return firstFaster ? !firstHigher : firstHigher;
};

export const calcVargaValue = (lng: number, num: number) => (lng * num) % 360;

export const subtractLng360 = (lng: number, offset = 0) =>
  (lng + 360 - offset) % 360;

export const addLng360 = (lng: number, offset = 0) =>
  (lng + 360 + offset) % 360;

export const subtractSign = (sign1: number, sign2: number) =>
  (sign1 + 12 - sign2) % 12;

export const calcAllVargas = (lng: number) => {
  return vargaValues.map(v => {
    const value = calcVargaValue(lng, v.num);
    return { num: v.num, key: v.key, value };
  });
};

export const calcVargaSet = (lng: number, num, key) => {
  const values = calcAllVargas(lng);
  return {
    num,
    key,
    values,
  };
};

export const calcInclusiveDistance = (
  posOne: number,
  posTwo: number,
  base: number,
) => ((posTwo - posOne + base) % base) + 1;

export const calcInclusiveTwelfths = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 12);

export const calcInclusiveNakshatras = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 27);

export const nakashatra27Fraction = (lng: number) =>
  (lng % (360 / 27)) / (360 / 27);

export const toSignValues = (
  values: Array<number>,
  houseSign = 0,
): Array<SignValue> => {
  return values.map((value, index) => {
    const sign = index + 1;
    const house = calcInclusiveTwelfths(sign, houseSign);
    return {
      sign,
      value,
      house,
    };
  });
};

export const calcCoordsDistance = (geo1: LngLat, geo2: LngLat, unit = 'km') => {
  if (geo1.lat == geo2.lat && geo1.lng == geo2.lng) {
    return 0;
  } else {
    const radlat1 = (Math.PI * geo1.lat) / 180;
    const radlat2 = (Math.PI * geo1.lat) / 180;
    const theta = geo1.lng - geo2.lng;
    const radtheta = (Math.PI * theta) / 180;
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    const matchUnit = (str: string) => {
      switch (str.trim().toLowerCase()) {
        case 'km':
        case 'k':
          return 1.609344;
        case 'nm':
        case 'n':
          return 0.8684;
        default:
          return 1;
      }
    };
    const unitStr = typeof unit === 'string' ? unit : 'm';
    const multiplier = matchUnit(unitStr);
    return dist * multiplier;
  }
};

export const matchNakshatra28 = (index: number, offset = 0) => {
  const num = index + 1;
  const dictNum = num > 22 ? num - 1 : num;
  const ref = zeroPad(num);
  const itemKey = num < 22 ? 'n27_' + ref : 'n28_' + num;
  const dictKey =
    num < 22
      ? 'n27_' + ref
      : num === 22
      ? 'n28_' + ref
      : 'n27_' + zeroPad(dictNum);
  return { num, ref, itemKey, dictKey };
};

export const matchNakshatra28Item = (
  nakshatraValues: Array<NakshatraItem>,
  num = 0,
  itemKey = '',
) => {
  return nakshatraValues.find(nv => {
    if (num <= 22) {
      return nv.key === itemKey;
    } else {
      return nv.key28 === itemKey;
    }
  });
};

export const calcDist360 = (lng1: number, lng2: number) => {
  const lngs = [lng1, lng2];
  lngs.sort((a, b) => (a < b ? -1 : 1));
  const [low, high] = lngs;
  const results = [high - low, low + 360 - high];
  const minDiff = Math.min(...results);
  return minDiff;
};

export const loopShift = (arr: Array<any>, index: number) => {
  const s1 = arr.slice(index, arr.length);
  const s2 = arr.slice(0, index);
  return [...s1, ...s2];
};

export const loopShiftInner = (arr: Array<SignValue>, index) => {
  const values = arr.map(p => p.value);
  const shifted = loopShift(arr, index);
  return shifted.map((p, i) => {
    const value = values[i];
    return {
      sign: p.sign,
      house: p.house,
      value,
    };
  });
};

export const plotOnCircle = (
  radius: number,
  angle: number,
  offsetX = 0,
  offsetY = 0,
  counterClockwise = true,
) => {
  const deg = counterClockwise ? 540 - angle : angle;
  const x = radius * Math.cos((deg * Math.PI) / 180) + 50 + offsetX;
  const y = radius * Math.sin((deg * Math.PI) / 180) + 50 + offsetY;
  return { x, y };
};

export const renderOffsetStyle = (x: number, y: number, deg = 0) => {
  const suffix = deg !== 0 ? `transform:rotate(${deg}deg)` : '';
  return `top: ${y}%;left: ${x}%;${suffix};`;
};

export const deepClone = (obj = null) => {
  if (obj instanceof Object) {
    return Object.assign(
      Object.create(
        // Set the prototype of the new object to the prototype of the instance.
        // Used to allow new object behave like class instance.
        Object.getPrototypeOf(obj),
      ),
      // Prevent shallow copies of nested structures like arrays, etc
      JSON.parse(JSON.stringify(obj)),
    );
  }
};

export const midLng = (lng1: number, lng2: number) => {
  const lngs = [lng1, lng2];
  lngs.sort();
  const [l1, l2] = lngs;
  const median = ((l1 + l2) / 2) % 360;
  const dist = Math.abs(median - l1);
  return dist > 90 ? ((360 + l1 + l2) / 2) % 360 : median;
};

export const extractSurfaceData = (paired: any) => {
  let surface = null;
  if (paired instanceof Object) {
    const { surfaceGeo, surfaceAscendant, surfaceTzOffset } = paired;
    if (surfaceGeo instanceof Object) {
      const { lat, lng } = surfaceGeo;
      surface = {
        geo: { lng, lat },
        ascendant: surfaceAscendant,
        tzOffset: surfaceTzOffset,
      };
    }
  }
  return surface;
};

export const degToSign = (lng: number) => Math.floor(lng / 30) + 1;

export const calcAspects = (lng1: number, lng2: number) => {
  const aspectFracs = aspectGroups.reduce((a, b) => a.concat(b), []);
  const diff = calcDist360(lng1, lng2);
  const aspects = aspectFracs.map(row => {
    const { div, fac } = row;
    const deg = ((1 / div) * fac * 360) % 360;
    const positive = diff >= 0;
    const orb = positive ? deg - diff : 0 - (deg - Math.abs(diff));
    const absOrb = Math.abs(orb);
    return {
      div,
      fac,
      target: deg,
      orb,
      absOrb,
    };
  });
  aspects.sort((a, b) => a.absOrb - b.absOrb);
  const topAspects = aspects.filter(aspect => aspect.absOrb <= 15);
  return { deg: diff, aspects: topAspects };
};

export const inSignDegree = (lng: number) => {
  return lng % 30;
};

export const abhijitNakshatraRange = () => {
  return [(360 / 27) * 20.75, (360 / 27) * (21 + 1 / 15)];
};

export const nakshatra27 = (lng: number) => {
  return Math.floor(lng / (360 / 27)) + 1;
};

export const nakshatra28 = (lng: number) => {
  let nkVal = nakshatra27(lng);
  const [minAbhjit, maxAbhjit] = abhijitNakshatraRange();
  if (lng >= minAbhjit) {
    nkVal = lng < maxAbhjit ? 22 : nkVal + 1;
  }
  return nkVal;
};

export const nakshatra28ToDegrees = (nakRef: number, offset = 0): number[] => {
  const nak = 360 / 27;
  const nakNum = ((nakRef - 1 + offset + 28) % 28) + 1;
  let start = (nakNum - 1) * nak;
  let end = nakNum * nak;
  const [minAbhjit, maxAbhjit] = abhijitNakshatraRange();
  if (nakNum === 21) {
    end = minAbhjit;
  } else if (nakNum === 22) {
    start = minAbhjit;
    end = maxAbhjit;
  } else if (nakNum > 22) {
    if (nakNum === 23) {
      start = maxAbhjit;
    } else {
      start -= nak;
    }
    end -= nak;
    if (end > 360) {
      end = 360;
    }
  }
  return [start, end];
};

export const numbersToRanges = (
  nums: number[],
  addEndOffset = true,
): number[][] => {
  const ranges = [];
  const endOffset = addEndOffset ? 1 : 0;
  if (nums.length > 0) {
    const lastIndex = nums.length - 1;
    if (nums.length > 1) {
      nums.sort((a, b) => a - b);
      let min = nums[0];
      for (let i = 0; i < lastIndex; i++) {
        const next = nums[i + 1];
        const curr = nums[i];
        if (curr !== next - 1) {
          ranges.push([min, curr + endOffset]);
          min = next;
        }
        if (i === lastIndex - 1) {
          ranges.push([min, next + endOffset]);
        }
      }
    } else {
      ranges.push([nums[0], nums[0] + endOffset]);
    }
  }
  return ranges;
};

export const numbersToSpans = (nums: number[]) => {
  return numbersToRanges(nums, false);
};

export const numbersToNakshatraDegreeRanges = (
  nums: number[],
  offset = 0,
): number[][] => {
  return numbersToSpans(nums).map(span => {
    if (span[0] === span[1]) {
      return nakshatra28ToDegrees(span[0], offset);
    } else {
      const start = nakshatra28ToDegrees(span[0], offset);
      const end = nakshatra28ToDegrees(span[1], offset);
      return [start[0], end[1]];
    }
  });
};

export const withinNakshatra27 = (lng: number) => {
  return lng % (360 / 27);
};

export const nakshatra27Progress = (lng: number) => {
  return withinNakshatra27(lng) / (360 / 27);
};

export const withinNakshatra28 = (lng: number) => {
  const nkVal = nakshatra28(lng);
  const [abStart, abEnd] = abhijitNakshatraRange();
  switch (nkVal) {
    case 22:
      return lng - abStart;
    case 23:
      return lng - abEnd;
    default:
      return withinNakshatra27(lng);
  }
};

export const nakshatra28Progress = (lng: number) => {
  const nkVal = nakshatra28(lng);
  const [abStart, abEnd] = abhijitNakshatraRange();
  switch (nkVal) {
    case 21:
      return (lng - (360 / 27) * 20) / (abStart - (360 / 27) * 20);
    case 22:
      return (lng - abStart) / (abEnd - abStart);
    case 23:
      return (lng - abEnd) / ((360 / 27) * 22 - abEnd);
    default:
      return nakashatra27Fraction(lng);
  }
};

export const shortenName = (str = '', maxLength = 25): string => {
  let txt = '';
  if (typeof str === 'string') {
    const parts = str.split(' ');
    const numParts = parts.length;
    const outParts = [parts[0]];

    if (numParts > 2 && parts[2].length < 5) {
      outParts.push(parts[numParts - 2]);
    }
    if (numParts > 1) {
      outParts.push(parts[numParts - 1]);
    }
    const totLen = outParts.join(' ').length;
    if (totLen > maxLength * 0.9 && outParts.length > 1) {
      outParts[0] = outParts[0].substring(0, 1).toUpperCase() + '.';
    }
    txt = outParts.join(' ');
    if (txt.length > maxLength) {
      txt = str.substring(0, maxLength);
    }
  }
  return txt;
};

export const toFirstName = (name: string): string => {
  if (notEmptyString(name, 3)) {
    const parts = name.split(' ');
    const first = parts[0];
    return first.length > 1
      ? first
      : parts.length > 1
      ? parts.slice(0, 1).join(' ')
      : name;
  } else {
    return name;
  }
};

export const generateNameSearchRegex = (str: string): string => {
  const replMap = [
    ['a', 'å', 'á', 'à', 'ä', 'ã', 'â'],
    ['e', 'é', 'è', 'ë', 'ê'],
    ['i', 'í', 'ì', 'ï', 'î'],
    ['o', 'ó', 'ò', 'ö', 'ô', 'õ'],
    ['u', 'ú', 'ù', 'ü'],
    ['n', 'ñ'],
  ];
  const letters = replMap.reduce((a, b) => a.concat(b.slice(1)), []);
  const allLetters = new RegExp('[^a-z0-9' + letters.join('') + ']', 'i');
  str = str.trim().replace(allLetters, '.*?');
  replMap.forEach(row => {
    const expandedSet = ['[', ...row, ']'].join('');
    const expandedStart = expandedSet.substring(0, 2);
    row.forEach(letter => {
      if (str.includes(letter) && !str.includes(expandedStart)) {
        str = str.replace(new RegExp(letter, 'i'), expandedSet);
      }
    });
  });
  return str;
};

export const toLocationString = (toponyms: Placename[]) => {
  const numParts = toponyms.length;
  const lastIndex = numParts - 1;
  const last2Index = numParts - 2;
  const items =
    numParts > 4
      ? [toponyms[lastIndex], toponyms[last2Index], toponyms[0]]
      : numParts > 1
      ? [toponyms[lastIndex], toponyms[0]]
      : [];
  const names = [];
  items.forEach(item => {
    const { name } = item;
    if (names.includes(name) === false) {
      names.push(name);
    }
  });
  return names.join(', ');
};

export const simplifyGeoData = (geoData = null) => {
  const toponyms =
    geoData instanceof Object &&
    Object.keys(geoData).includes('toponyms') &&
    geoData.toponyms instanceof Array
      ? geoData.toponyms
      : [];
  return toLocationString(toponyms);
};

import * as swisseph from 'swisseph';
import { calcUtAsync } from './sweph-async';
import { calcJulDate, jdToDateTime, julToISODate } from './date-funcs';
import grahaValues from './settings/graha-values';
import { inRange360, isNumber, isNumeric, notEmptyString, withinTolerance } from '../../lib/validators';
import { matchPlanetNum } from './settings/graha-values';
import { calcAyanamsha, calcBodiesJd, fetchHouseDataJd } from './core';
import { subtractLng360 } from './math-funcs';
import { calcAscendantTimelineItems, calcOffsetAscendant } from './calc-ascendant';
import { LngLat } from './interfaces';
import { currentJulianDay } from './julian-date';
import { addLng360, nakshatra28, nakshatra28ToDegrees } from './helpers';
import { GeoPos } from '../interfaces/geo-pos';

export interface SignTimelineItem {
  sign?: number;
  lng: number;
  jd: number;
  dt?: string;
  spd: number;
  duration?: number;
}

export interface SignTimelineSet {
  key: string;
  jd: number;
  dt?: string;
  longitude: number;
  sign?: number;
  nextMatches: SignTimelineItem[];
  avg?: number;
}

export const calcBodySpeed = async (jd: number, num: number, callback) => {
  const flag =
    swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SIDEREAL + swisseph.SEFLG_SPEED;
  let flip = false;
    switch(num) {
      case 101:
      case 102: 
        num = swisseph.SE_MEAN_NODE;
        flip = num === 102;
        break;
    }
  await calcUtAsync(jd, num, flag).catch(async result => {
    if (result instanceof Object) {
      if (!result.error) {
        const lng = flip ? addLng360(result.longitude, 180) : result.longitude;
        callback(result.longitudeSpeed, lng);
      }
    }
  });
};

export const calcBodyPos = async (key = "", jd = 0, ayanamsha = "true_citra") => {
  const ayaKey = notEmptyString(ayanamsha)? ayanamsha : "true_citra";
  const applyAyanamsha = ayaKey !== "tropical";
  const aya = applyAyanamsha? await calcAyanamsha(jd, ayaKey) : 0;
  const body = grahaValues.find(b => b.key === key);
  if (jd < 1) {
    jd = currentJulianDay();
  }
  let lng = 0;
  let speed = 0;
  const num = body instanceof Object ? body.num : -1;
  if (num > 0) {
    await calcBodySpeed(jd, num, (sp, deg) => {
      speed = sp;
      lng = deg;
    });
  }
  return { lng, speed, ayanamsha: 0 };
};

export const calcBodyLng = async (key = "", jd = 0, ayanamsha = "true_citra") => {
  const result = await calcBodyPos(key, jd, ayanamsha);
  return result.lng;
}

export const calcAcceleration = async (jd, body) => {
  const { num } = body;
  let spds = [];
  for (let i = 0; i < 2; i++) {
    const refJd = jd + i * 0.5;
    await calcBodySpeed(refJd, num, (speed, lng) => {
      spds.push({ speed, lng, jd: refJd, datetime: jdToDateTime(refJd) });
    });
  }
  const [start, end] = spds;
  const rate = end.speed / start.speed;
  return { start, end, rate, rising: rate >= 1, switching: rate < 0 };
};

export const calcStation = async (jd, num, station) => {
  const max = 4 * 24 * 60;
  const startJd = jd - 1;
  let maxSpd = 0;
  let minSpd = 0;
  let saveSpd = 0;
  let saveLng = 0;
  let saveJd = 0;
  let prevAbsSpd = 10;
  let minAbsSpd = 10;
  let prevSpd = 0;
  let prevPolarity = 0;
  let matched = false;
  let saveAccel = 0;
  for (let i = 0; i < max; i++) {
    const refJd = startJd + i / (24 * 60);

    await calcBodySpeed(refJd, num, (spd, lng) => {
      const currPolarity = spd >= 0 ? 1 : -1;
      const absSpd = Math.abs(spd);
      // ['sample', 'peak','retro-start','retro-peak','retro-end'],
      switch (station) {
        case 'peak':
          if (spd > maxSpd && spd >= 0) {
            maxSpd = spd;
          } else {
            matched = true;
            maxSpd = -1;
          }
          break;
        case 'retro-peak':
          if (spd < minSpd && spd < 0) {
            minSpd = spd;
          } else {
            matched = true;
            minSpd = 1;
          }
          break;
        case 'retro-start':
        case 'retro-end':
          if (absSpd < minAbsSpd) {
            minAbsSpd = absSpd;
          } else {
            matched = true;
            minSpd = 1;
          }
          break;
      }
      saveLng = lng;
      saveSpd = prevSpd;
      saveJd = refJd;
      prevAbsSpd = absSpd;
      prevSpd = spd;
      prevPolarity = currPolarity;
    });
    if (matched) {
      await calcBodySpeed(saveJd - 0.5, num, (spd2, lng2) => {
        saveAccel = saveSpd / spd2;
      });
      break;
    }
  }
  const returnData = {
    jd: saveJd,
    datetime: jdToDateTime(saveJd),
    num,
    speed: saveSpd,
    lng: saveLng,
    acceleration: saveAccel,
    station,
  };
  return returnData;
};

const calcSwitchover = async (jd, body) => {
  const { num, yearLength } = body;
  const max = Math.ceil(body.yearLength);
  let rate = 0;
  let refSpeed = null;
  let polarity = 0;
  let prevPolarity = 0;
  let switched = false;
  let row: any = {
    spd: 0,
    lng: 0,
    jd: 0,
    polarity: -1,
  };
  for (let i = 0; i < max; i++) {
    const multiplier =
      rate > 0 ? (rate > 1.25 && refSpeed < 1 ? refSpeed : rate) : 1 / 288;
    const refJd = jd + i * multiplier;
    await calcBodySpeed(refJd, num, (spd, lng) => {
      rate = refSpeed !== null ? refSpeed / spd : 0;
      polarity = spd < 0 ? -1 : 1;
      switched = polarity !== prevPolarity && prevPolarity !== 0;
      if (switched) {
        row = {
          spd,
          dt: jdToDateTime(refJd),
          jd: refJd,
          lng,
          polarity,
          rate,
          multiplier,
        };
      }
      refSpeed = spd;
      prevPolarity = polarity;
    });
    if (switched) {
      break;
    }
  }
  return row;
};

const calcPeakSpeed = async (jd, body) => {
  const { num, yearLength } = body;
  const max = Math.ceil(body.yearLength);
  let rate = 0;
  let refSpeed = null;
  let polarity = 0;
  let prevPolarity = 0;
  let row: any = {
    spd: 0,
    lng: 0,
    jd: 0,
    polarity: -1,
  };
  let prevRate = 0;
  for (let i = 0; i < max; i++) {
    const multiplier = rate > 0 ? rate : 1 / 288;
    const refJd = jd + i * multiplier;
    await calcBodySpeed(refJd, num, (spd, lng) => {
      rate = refSpeed !== null ? refSpeed / spd : 0;
      polarity = spd < 0 ? -1 : 1;

      const peaked = prevRate !== 0 && withinTolerance(rate, 1, 0.02);
      if (peaked) {
        row = {
          spd,
          dt: jdToDateTime(refJd),
          jd: refJd,
          lng,
          polarity,
          rate,
          multiplier,
        };
      }
      refSpeed = spd;
      prevRate = rate;
    });
  }
  return row;
};

export const calcRetroGrade = async (datetime, num) => {
  const jd = calcJulDate(datetime);
  const body = grahaValues.find(b => b.num === num);
  const accel = await calcAcceleration(jd, body);
  let nx: any = { jd: 0, lng: 0 };
  let refJd = jd;
  const nextSwitches = [];

  for (let i = 0; i < 8; i++) {
    nx = await calcSwitchover(refJd, body);
    if (nx) {
      refJd = nx.jd;
      nextSwitches.push(nx);
      nx = await calcPeakSpeed(refJd, body);
      if (nx) {
        refJd = nx.jd;
        nextSwitches.push(nx);
      }
    }
  }

  return {
    key: body.key,
    accel,
    nextSwitches,
    // start,
    // end
  };
};


export const matchProgressionJdStep = (key = "su") => {
  switch (key) {
    case "mo":
      return 0.125;
    case "ma":
      return 1;
    case "ve":
      return 0.5;
    case "me":
      return 0.125;
    case "ju":
      return 2;
    case "sa":
    case "ke":
    case "ra":
      return 3;
    case "ur":
    case "ne":
    case "pl":
      return 7;
    default:
      return 0.5;
  }
}

export const fetchAscendant = async (key = "as", jd = 0, geo = null) => {
  const data = await fetchHouseDataJd(jd, geo, 'W');
  switch (key) {
    case "as":
      return data.ascendant;
    case "mc":
      return data.mc;
      case "vt":
        return data.vertex;
  }
}

export const matchNextTransitAtLng = async (key = "su", lngFl = 0, jdFl = 0, ayanamsha = "true_citra") => {
  const num = isNumeric(key)? parseInt(key) : matchPlanetNum(key);
  const ayaKey = notEmptyString(ayanamsha)? ayanamsha : "true_citra";
  const applyAyanamsha = ayaKey !== "tropical";
  const spds = [];
  const aya = applyAyanamsha? await calcAyanamsha(jdFl, ayaKey) : 0;
  await calcBodySpeed(jdFl, num, (speed, lng) => {
    spds.push({ speed, lng, jd: jdFl });
  });
  let refJd = jdFl;
  let i = 0;
  const step = matchProgressionJdStep(key);
  let stopIndex = 6000;
  let matchedIndex = false;
  while (i < stopIndex) {
    refJd += step;
    await calcBodySpeed(refJd, num, (speed, lng) => {
      spds.push({ speed, lng, jd: refJd });
    });
    if (spds.length > 0) {
      const lastItem = spds[(spds.length -1)];
      const retro = lastItem.speed < 0;
      const diff = lastItem.lng - lngFl;
      const matchedRow = (!retro && diff < lastItem.speed * step && diff >= 0) || (retro && diff > lastItem.speed * step && diff <= 0);
      if (matchedRow) {
        if (!matchedIndex) {
          stopIndex = i + 2;
          matchedIndex = true;
        }
      }
    }
    i++;
  }
  if (spds.length > 3) {
    spds.splice(0, spds.length - 3);
  }
  let ranges = [];
  const numSpds = spds.length;
  for (let i = 1; i < numSpds; i++) {
    const prevLng = spds[(i-1)].lng;
    const prevSpd = spds[(i-1)].speed * step;
    const currLng = spds[i].lng;
    if ((currLng >= lngFl || (currLng + prevSpd) >= lngFl) && (prevLng <= lngFl || (prevLng - 360) <= lngFl)) {
      ranges.push(spds[(i-1)]);
    }
  }
  if (ranges.length < 2) {
    ranges = spds.slice(spds.length -2, spds.length);
  }
  const [start, end ] = ranges;
  const distance = subtractLng360(lngFl, start.lng);
  const spanDeg = subtractLng360(end.lng, start.lng);
  const progress = spanDeg > 0 ? distance / spanDeg : 0;
  const progressJd = progress * step;
  const targetJd = start.jd + progressJd;
  let speed = 0;
  await calcBodySpeed(targetJd, num, (sp) => {
    speed = sp;
  });
  return { start, end, speed, targetJd, num, ayanamsha: aya };
}

export class RangeSet {
  range = [0, 0];
  speedMode = 0;

  constructor(range: number[] = [], spMode = 0) {
    if (range instanceof Array && range.length === 2) {
      this.range = range;
    }
    if (spMode !== 0 && isNumber(spMode)) {
      this.speedMode = spMode < 0? -1 : 1;
    }
  }

  get applySpeed() {
    return this.speedMode !== 0;
  }

  get neutral() {
    return this.speedMode === 0;
  }

  get directOnly() {
    return this.speedMode > 0;
  }

  get retrogradeOnly() {
    return this.speedMode < 0;
  }

  isValidDirection(speed: number) {
    const retrograde = speed < 0;
    
    return this.neutral || (retrograde && this.retrogradeOnly) || (!retrograde && this.directOnly);
  }

  isValid(deg = 0, speed = 0, startOffset = 0) {
    const relRange = [subtractLng360(this.range[0], startOffset),subtractLng360(this.range[1], startOffset)];
    return inRange360(deg, relRange) && this.isValidDirection(speed);
  }

}

const toStartNakshatra28 = (deg: number) => {
  const nakNum = nakshatra28(deg);
  const [start, _] = nakshatra28ToDegrees(nakNum, 0);
  return start;
}

const referenceBodyLng = async (key = "", jdFl = 0, ayanamsha = "true_citra", roundMode = 'none') => {
  let lng = key.length === 2? await calcBodyLng(key, jdFl, ayanamsha) : 0;
  if (roundMode === 'nakshatra28') {
    lng = toStartNakshatra28(lng);
  }
  return lng;
}

const referenceBodyPos = async (key = "", jdFl = 0, geo: GeoPos = { lat: 0, lng: 0 }, ayanamshaVal = 0) => {
  let speed = 0;
  let lng = 0;
  let jd = 0;
  const isAsc = key === 'as';
  if (isAsc) {
    const body = grahaValues.find(b => b.key === key);
    if (body instanceof Object) {
      await calcBodySpeed(jdFl, body.num, (spdVal, lngDeg) => {
        speed = spdVal;
        lng = lngDeg;
      });
    }
  } else {
    lng = calcOffsetAscendant(geo.lat, geo.lng, jdFl, ayanamshaVal);
  }
  return { lng, jd, speed };
}

export const matchNextTransitAtLngRanges = async (key = "su", rangeSets: RangeSet[] = [], jdFl = 0, geo: GeoPos, refKey = '', ayanamsha = 'true_citra', roundMode = 'nakshatra28') => {
  const num = isNumeric(key)? parseInt(key) : matchPlanetNum(key);
  const ayaKey = notEmptyString(ayanamsha)? ayanamsha : 'true_citra';
  const applyAyanamsha = ayaKey !== 'tropical';
  const spds = [];
  const aya = applyAyanamsha? await calcAyanamsha(jdFl, ayaKey) : 0;
  let relOffset = await referenceBodyLng(refKey, jdFl, ayanamsha, roundMode);
  /* await calcBodySpeed(jdFl, num, (speed, lng) => {
    if (rangeSets.some(range => range.isValid(lng, speed, relOffset))) {
      spds.push({ speed, lng, jd: jdFl });
    }
  }); */
  const { lng, speed } = await referenceBodyPos(key, jdFl, geo, aya);
  if (rangeSets.some(range => range.isValid(lng, speed, relOffset))) {
    spds.push({ speed, lng, jd: jdFl });
  }
  let refJd = jdFl;
  let i = 0;
  const step = matchProgressionJdStep(key) * 2;
  let stopIndex = spds.length < 1? 18000 : 0;
  let matchedIndex = false;
  while (i < stopIndex) {
    refJd += step;
    relOffset = await referenceBodyLng(refKey, refJd, ayanamsha, roundMode);
    /* await calcBodySpeed(refJd, num, (speed, lng) => {
      if (rangeSets.some(range => range.isValid(lng, speed, relOffset))) {
        spds.push({ speed, lng, jd: refJd });
        stopIndex = i;
        matchedIndex = true;
      }
    }); */
    const { lng, speed } = await referenceBodyPos(refKey, refJd, geo, aya);
    if (rangeSets.some(range => range.isValid(lng, speed, relOffset))) {
      spds.push({ speed, lng, jd: refJd });
      stopIndex = i;
      matchedIndex = true;
    }
    if (matchedIndex) {
      break;
    }
    i++;
  }
  const hasMatch = spds.length > 0;
  const firstMatch = hasMatch ? spds[0] : null;
  const targetJd = hasMatch? firstMatch.jd : 0;
  let spdVal = 0;
  await calcBodySpeed(targetJd, num, (sp) => {
    spdVal = sp;
  });
  const targetLng = hasMatch? firstMatch.lng : 0;
  return { valid: targetJd > 0, speed: spdVal, targetJd, targetLng, num, ayanamsha: aya };
}

export const calcSignSwitchAvg = (items: SignTimelineItem[]) => {
  const numMatches = items.length;
  return numMatches > 1 ? items.slice(1).map(item => item.duration).reduce((a,b) => a + b, 0) / (numMatches - 1) : 0
}

export const calcCoreSignTimeline = async (startJd = 0, endJd = 0, ayanamshaKey = "true_citra"): Promise<SignTimelineSet[]> => {
  return await calcCoreIntervalTimeline(12, startJd, endJd, ayanamshaKey);
}

export const calcCoreKakshaTimeline = async (startJd = 0, endJd = 0, excludeMoon = false, ayanamshaKey = "true_citra"): Promise<SignTimelineSet[]> => {
  return await calcCoreIntervalTimeline(96, startJd, endJd, ayanamshaKey, excludeMoon);
}

export const calcCoreIntervalTimeline = async (subDiv = 12, startJd = 0, endJd = 0, ayanamshaKey = "true_citra", excludeMoon = false): Promise<SignTimelineSet[]> => {
  const coreKeys = [ "sa", "ju", "ma", "su", "ve", "me"];
  if (!excludeMoon) {
    coreKeys.push("mo");
  }
  const degInterval = 360 / subDiv;
  const bodies = await calcBodiesJd(startJd, coreKeys);
  const ayanamshaVal = await calcAyanamsha(startJd, ayanamshaKey);
  const grahas = [];
  const dt = julToISODate(startJd);
  for (const gr of bodies) {
    const nextMatches = [];
    let reachedEnd = false;
    let i = 0;
    //const refLng = subtractLng360(gr.lng, ayanamshaVal);
    const refLng = gr.lng;
    const refSign = Math.floor(refLng / degInterval) + 1;
    let refStartJd = startJd - 0;
    while (!reachedEnd && i < 108) {
      const nextSign = ((refSign + i - 1) % subDiv) + 1;
      const nextLng = (nextSign * degInterval) % 360;
      const next = await matchNextTransitAtLng(gr.key, nextLng, refStartJd, ayanamshaKey);
      const currSign = nextSign < subDiv ? nextSign + 1 : 1;
      const duration = next.targetJd - refStartJd;
      refStartJd = next.targetJd;
      nextMatches.push({ sign: currSign, lng: nextLng, jd: next.targetJd, dt: julToISODate(next.targetJd), spd: next.end.spd, duration });
      reachedEnd = next.targetJd >= endJd;
      i++;
    }
    grahas.push({ 
      key: gr.key,
      jd: startJd,
      dt,
      longitude: refLng,
      sign: refSign,
      nextMatches,
      avg: calcSignSwitchAvg(nextMatches)
    })
  };
  return grahas;
}

export const calcAscendantTimelineSet = async (geo: LngLat, startJd = 0, endJd = 0, ayanamshaKey = "true_citra") => {
  return await calcAscendantIntervalTimelineSet(12, geo, startJd, endJd, ayanamshaKey);
}

export const calcAscendantKakshaSet = async (geo: LngLat, startJd = 0, endJd = 0, ayanamshaKey = "true_citra") => {
  return await calcAscendantIntervalTimelineSet(96, geo, startJd, endJd, ayanamshaKey);
}

export const calcAscendantIntervalTimelineSet = async (subDiv = 12, geo: LngLat, startJd = 0, endJd = 0, ayanamshaKey = "true_citra") => {
  const ayanamshaVal = await calcAyanamsha(startJd, ayanamshaKey);
  const ascendant = calcOffsetAscendant(geo.lat, geo.lng, startJd, ayanamshaVal);
  
  const ascendantData = calcAscendantTimelineItems(subDiv, geo.lat, geo.lng, startJd, endJd, ayanamshaVal);
  const { items } = ascendantData;
  return { 
    key: "as", 
    jd: startJd,
    dt: julToISODate(startJd),
    longitude: ascendant,
    nextMatches: items,
    avg: calcSignSwitchAvg(items)
  };
}

export const calcGrahaSignTimeline = async (geo: LngLat, startJd = 0, endJd = 0, ayanamshaKey = "true_citra"): Promise<SignTimelineSet[]> => {
  const grahas = await calcCoreSignTimeline(startJd, endJd, ayanamshaKey);
  const ascendantData = await calcAscendantTimelineSet(geo, startJd, endJd, ayanamshaKey);
  grahas.push(ascendantData);
  return grahas;
}

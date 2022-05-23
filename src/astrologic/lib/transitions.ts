import * as swisseph from 'swisseph';
import { calcJulDate, julToISODate } from './date-funcs';
import { JyotishDay } from './models/jyotish-day';
import { IndianTime } from './models/indian-time';
import { riseTransAsync } from './sweph-async';
import { isNumeric } from '../../lib/validators';
import { ephemerisDefaults } from '../../.config';
import { GeoLoc } from './models/geo-loc';
import { calcGrahaLng } from './core';
import { GeoPos } from '../interfaces/geo-pos';
import { matchPlanetNum } from './settings/graha-values';
import { calcTransposedGrahaTransition, GrahaPos } from './point-transitions';

export interface TimeSet {
  jd: number;
  dt?: string;
  lng?: number;
  after: boolean;
}

export interface TransitionData {
  rise: TimeSet;
  set: TimeSet;
  prevRise?: TimeSet;
  prevSet?: TimeSet;
  nextRise?: TimeSet;
  ic?: TimeSet;
  mc?: TimeSet;
  num?: number;
  body?: string;
  key?: string;
  valid?: boolean;
}

export interface SunTransitionData {
  jd: number;
  datetime?: Date;
  geo: GeoLoc;
  rise: TimeSet;
  set: TimeSet;
  prevRise: TimeSet;
  prevSet: TimeSet;
  nextRise: TimeSet;
  nextSet?: TimeSet;
}

interface TransitionInput {
  jd: number;
  planetNum: number;
  iflag: number;
  transType: number;
  longitude: number;
  latitude: number;
  altitude: number;
  pressure: number;
  temperature: number;
}

export const matchTransData = async (
  inData: TransitionInput,
  transType = 0,
  transKey = 'rise',
  adjustRise = false,
  startJd = -1,
): Promise<TimeSet> => {
  let data = { valid: false, transitTime: -1 };
  inData.transType = transType;
  // set the rise offset to 12 hrs ago
  const riseOffset =
    transKey !== 'set' && inData.planetNum === swisseph.SE_SUN && adjustRise
      ? -0.5
      : 0;
  const jd = inData.jd;
  const jdIndex = Object.keys(inData).indexOf('jd');
  const args = Object.values(inData);
  // if startJd specified search next transition after referenced jd
  const hasStartJd = startJd > 0;
  if (riseOffset !== 0 || hasStartJd) {
    if (hasStartJd) {
      args[jdIndex] = startJd;
    } else {
      args[jdIndex] += riseOffset;
    }
  }
  await riseTransAsync(...args).catch(d => {
    data = d;
    if (!d.error) {
      data.valid = true;
    } else {
      data.valid = false;
    }
  });
  let result: TimeSet = { jd: -1, after: false };
  if (data.valid) {
    if (data.transitTime >= 0) {
      result = {
        jd: data.transitTime,
        //dt: jdToDateTime(data.transitTime),
        after: jd > data.transitTime,
      };
    }
  }
  return result;
};

const centerDiscRising = () => {
  return (
    swisseph.SE_BIT_DISC_CENTER | swisseph.SE_BIT_NO_REFRACTION ||
    swisseph.SE_BIT_GEOCTR_NO_ECL_LAT
  );
};

export const calcTransitionJd = async (
  jd: number,
  geo,
  planetNum,
  adjustRise = false,
  showIcMc = false,
  showLng = false,
): Promise<TransitionData> => {
  let data = null;
  if (isNumeric(jd)) {
    let valid = false;
    let longitude = 0;
    let latitude = 0;
    let { altitude } = ephemerisDefaults;
    if (!planetNum) {
      planetNum = 0;
    }
    if (geo instanceof Object) {
      if (geo.lat) {
        latitude = geo.lat;
      }
      if (geo.lng) {
        longitude = geo.lng;
      }
      if (geo.alt) {
        altitude = geo.alt;
      }
    }
    const inData = {
      jd,
      planetNum,
      star: '',
      iflag: swisseph.SEFLG_TOPOCTR,
      transType: swisseph.SE_CALC_RISE,
      longitude,
      latitude,
      altitude,
      pressure: 10,
      temperature: 10,
    };
    const offset = centerDiscRising();
    let mc = null;
    let ic = null;

    let set = await matchTransData(
      inData,
      swisseph.SE_CALC_SET + offset,
      'set',
    );
    if (showIcMc) {
      mc = await matchTransData(
        inData,
        swisseph.SE_CALC_MTRANSIT,
        'mc',
        adjustRise,
      );
      ic = await matchTransData(
        inData,
        swisseph.SE_CALC_ITRANSIT,
        'ic',
        adjustRise,
      );
    }
    let rise = await matchTransData(
      inData,
      swisseph.SE_CALC_RISE + offset,
      'rise',
      adjustRise,
    );
    if (!adjustRise && rise.jd > set.jd) {
      rise = await matchTransData(
        inData,
        swisseph.SE_CALC_RISE + offset,
        'rise',
        true,
      );

      set = await matchTransData(
        inData,
        swisseph.SE_CALC_SET + offset,
        'set',
        false,
        rise.jd,
      );
    }
    if (rise.jd >= -1) {
      valid = true;
    }
    if (showIcMc) {
      data = { valid, rise, set, mc, ic };
    } else {
      data = { valid, rise, set };
    }
    if (showLng) {
      const sKeys = showIcMc ? ['rise', 'set', 'mc', 'ic'] : ['rise', 'set'];
      for (const sk of sKeys) {
        data[sk].lng = await calcGrahaLng(data[sk].jd, planetNum);
      }
    }
  }
  return data;
};

export const matchSwissEphTransType = (type = 'rise') => {
  switch (type) {
    case 'set':
    case 'ds':
      return { key: 'set', num: swisseph.SE_CALC_SET };
    case 'mc':
    case 'highest':
      return {
        key: 'mc',
        num: swisseph.SE_CALC_MTRANSIT,
      };
    case 'ic':
    case 'lowest':
      return {
        key: 'ic',
        num: swisseph.SE_CALC_ITRANSIT,
      };
    default:
      return {
        key: 'rise',
        num: swisseph.SE_CALC_RISE,
      };
  }
};

export const calcTransitionPointJd = async (
  jd = 0,
  gKey = '',
  geo: GeoPos,
  type = 'rise',
): Promise<TimeSet> => {
  const planetNum = matchPlanetNum(gKey);
  const { key, num } = matchSwissEphTransType(type);
  const inData = {
    jd,
    planetNum,
    star: '',
    iflag: swisseph.SEFLG_TOPOCTR,
    transType: num,
    longitude: geo.lng,
    latitude: geo.lat,
    altitude: geo.alt,
    pressure: 10,
    temperature: 10,
  } as TransitionInput;
  return await matchTransData(inData, num, key, false, jd);
};

export const calcTransposedTransitionPointJd = async (
  jd = 0,
  gKey = '',
  geo: GeoPos,
  type = 'rise',
  gPositions: GrahaPos[] = [],
): Promise<TimeSet> => {
  const grahaPos = gPositions.find(gp => gp.key === gKey);
  const { key } = matchSwissEphTransType(type);
  const timeSet = { jd: 0, lng: 0, dt: '', after: false };
  if (grahaPos instanceof Object) {
    const result = await calcTransposedGrahaTransition(jd, geo, grahaPos, key);
    if (result instanceof Array) {
      const trResult = result.find(tr => tr.type === key);
      if (trResult instanceof Object) {
        timeSet.jd = trResult.jd;
        timeSet.dt = trResult.isoDate;
        timeSet.lng = grahaPos.lng;
      }
    }
  }
  return timeSet;
};

export const calcTransition = async (
  datetime,
  geo,
  planetNum = 0,
  adjustRise = false,
) => {
  const jd = calcJulDate(datetime);
  const data = await calcTransitionJd(jd, geo, planetNum, adjustRise, true);
  return { jd, ...data };
};

export const offsetToMidNight = (jd = 0, geoLat = 0): number => {
  const offset = geoLat / 360;
  const utcMN = Math.floor(jd + 0.5) - 0.5;
  return utcMN - offset;
};

export const calcSunTransJd = async (
  jd,
  geo: GeoLoc,
  offsetToPrevMidNight = true,
): Promise<SunTransitionData> => {
  const offsetJd = offsetToPrevMidNight ? offsetToMidNight(jd, geo.lat) : jd;
  const curr = await calcTransitionJd(offsetJd, geo, 0, false, false);
  const prev = await calcTransitionJd(offsetJd - 1, geo, 0, false, false);
  const next = await calcTransitionJd(offsetJd + 1, geo, 0, false, false);
  return {
    jd,
    datetime: new Date(julToISODate(jd)),
    geo,
    ...curr,
    prevRise: prev.rise,
    prevSet: prev.set,
    nextRise: next.rise,
    nextSet: next.set,
  };
};

export const calcSunTrans = async (datetime, geo: GeoPos, tzOffset = 0) => {
  const jd = calcJulDate(datetime);
  const transData = await calcSunTransJd(jd, new GeoLoc(geo));
  return { ...transData, datetime, tzOffset };
};

export const calcJyotishDay = async (datetime, geo: GeoPos, tzOffset = 0) => {
  const sunData = await calcSunTrans(datetime, geo, tzOffset);
  return new JyotishDay(sunData);
};

export const calcJyotishSunRise = async (datetime, geo: GeoPos) => {
  const jyotishDay = await calcJyotishDay(datetime, geo);
  return jyotishDay.toObject();
};

export const fetchIndianTimeData = async (
  datetime,
  geo: GeoPos,
  tzOffset = 0,
) => {
  const jyotishDay = await calcJyotishDay(datetime, geo, tzOffset);
  return new IndianTime(jyotishDay);
};

export const toIndianTime = async (datetime, geo: GeoPos) => {
  const iTime = await fetchIndianTimeData(datetime, geo);
  return iTime.toObject();
};

export const toIndianTimeJd = async (jd = 0, geo: GeoPos) => {
  const sunData = await calcSunTransJd(jd, new GeoLoc(geo));
  const jyotishDay = new JyotishDay(sunData);
  const iTime = new IndianTime(jyotishDay);
  return iTime.toObject();
};

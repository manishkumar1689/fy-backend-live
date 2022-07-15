import { isNumeric } from '../../lib/validators';
import * as swisseph from 'swisseph';
import { GeoPos } from '../interfaces/geo-pos';
import { calcBodyJd } from './core';
import { jdToDateTime } from './date-funcs';
import { Chart } from './models/chart';
import { getAzalt } from './sweph-async';

const minsDay = 1440;

export interface GrahaPos {
  key: string;
  lng: number;
  lat: number;
  lngSpeed?: number;
}

export interface AltitudeResult {
  altitude: number;
  azimuth: number;
  apparentAltitude: number;
}

export const calcAltitudeResult = async (
  jd: number,
  geo: GeoPos,
  lng: number,
  lat: number,
  isEqual = false,
): Promise<AltitudeResult> => {
  const flag = isEqual ? swisseph.SE_EQU2HOR : swisseph.SE_ECL2HOR;
  let value = 0;
  let apparentAltitude = 0;
  let azimuth = 0;
  await getAzalt(jd, flag, geo.lng, geo.lat, geo.alt, 0, 0, lng, lat).catch(
    async result => {
      if (result instanceof Object) {
        if (!result.error) {
          if (Object.keys(result).includes('trueAltitude')) {
            value = result.trueAltitude;
            azimuth = result.azimuth;
            apparentAltitude = result.apparentAltitude;
          }
        }
      }
    },
  );
  return { altitude: value, azimuth, apparentAltitude };
};

export const calcAltitudeSE = async (
  jd: number,
  geo: GeoPos,
  lng: number,
  lat: number,
  isEqual = false,
): Promise<number> => {
  const result = await calcAltitudeResult(jd, geo, lng, lat, isEqual);
  return result.altitude
}

export class AltitudeSample {
  type = '';
  mins = 0;
  value = 0;
  jd = 0;

  constructor(row = null, type = '') {
    if (row instanceof Object) {
      Object.entries(row).forEach(([k, v]) => {
        if (typeof v === 'number') {
          switch (k) {
            case 'mins':
            case 'value':
            case 'jd':
              this[k] = v;
          }
        }
      });
    }
    if (type.length > 0) {
      this.type = type;
    }
  }

  withType(type = '') {
    this.type = type;
    return this;
  }

  get isoDate() {
    return this.jd > 0 ? jdToDateTime(this.jd) : '';
  }

  toObject() {
    return {
      type: this.type,
      value: this.value,
      jd: this.jd,
      dt: this.isoDate,
    };
  }
}

const calcMidPoint = (first: AltitudeSample, second: AltitudeSample) => {
  const valueDiff = second.value - first.value;
  const progress = second.value / valueDiff;
  const jdDiff = second.jd - first.jd;
  return second.jd - jdDiff * progress;
};

const calcMidSample = (
  item: AltitudeSample,
  prevMin = 0,
  prevValue = 0,
  prevJd = 0,
  type = '',
): AltitudeSample => {
  const prevSample = new AltitudeSample({
    mins: prevMin,
    value: prevValue,
    jd: prevJd,
  });
  const midPoint = calcMidPoint(prevSample, item);
  return new AltitudeSample({ mins: prevMin, value: 0, jd: midPoint }, type);
};

const recalcMinMaxTransitSample = async (
  sample: AltitudeSample,
  geo: GeoPos,
  lng = 0,
  lat = 0,
  maxMode = true,
  multiplier = 5,
) => {
  const sampleRate = 0.25;
  const numSubSamples = multiplier * 2 * (1 / sampleRate);

  const sampleStartJd = sample.jd - numSubSamples / (2 / sampleRate) / minsDay;
  const sampleStartMin = sample.mins - numSubSamples / (2 / sampleRate);
  const type = maxMode ? 'mc' : 'ic';
  for (let i = 0; i <= numSubSamples; i++) {
    const mins = sampleStartMin + i * sampleRate;
    const jd = sampleStartJd + (i * sampleRate) / minsDay;
    const value = await calcAltitudeSE(jd, geo, lng, lat);
    const item = new AltitudeSample({ mins, value, jd }, type);
    if (maxMode && item.value > sample.value) {
      sample = item;
    } else if (!maxMode && item.value < sample.value) {
      sample = item;
    }
  }
  return sample;
};

export const calcTransposedObjectTransitions = async (
  jdStart: number,
  geo: GeoPos,
  lng: number,
  lat: number,
  lngSpeed = 0,
  multiplier = 5,
  filterKeys: string[] = [],
  sampleKey = '',
) => {
  const max = minsDay / multiplier;
  const items = [];
  const filterKeyItems = filterKeys.length > 0;
  const matchSet = filterKeyItems ? filterKeys.includes('set') : true;
  const matchRise = filterKeyItems ? filterKeys.includes('rise') : true;
  const matchMc = filterKeyItems ? filterKeys.includes('mc') : true;
  const matchIc = filterKeyItems ? filterKeys.includes('ic') : true;
  let ic = new AltitudeSample(null, 'ic');
  let rise = new AltitudeSample(null, 'rise');
  let set = new AltitudeSample(null, 'set');
  let mc = new AltitudeSample(null, 'mc');
  let prevValue = 0;
  let prevMin = 0;
  let prevJd = 0;
  // resample the longitude and latitude speed for the moon only
  const resampleSpeed = sampleKey === 'mo' && lngSpeed !== 0;
  for (let i = 0; i <= max; i++) {
    const n = i * multiplier;
    const dayFrac = n / minsDay;
    const jd = jdStart + dayFrac;
    let sampleSpd = lngSpeed;
    let latSpd = 0;
    if (resampleSpeed) {
      const sampleBody = await calcBodyJd(jd, sampleKey, false, true);
      sampleSpd = sampleBody.lngSpeed;
      latSpd = sampleBody.latSpeed;
    }
    const adjustedLng = lngSpeed !== 0 ? lng + sampleSpd * dayFrac : lng;
    const adjustedLat = latSpd !== 0 ? lat + latSpd * dayFrac : lat;
    const value = await calcAltitudeSE(jd, geo, adjustedLng, adjustedLat);
    const item = new AltitudeSample({ mins: n, value, jd });
    if (matchMc && value > mc.value) {
      mc = item.withType('mc');
    }
    if (matchIc && value < ic.value) {
      ic = item.withType('ic');
    }
    if (matchRise && prevValue < 0 && value > 0) {
      rise = calcMidSample(item, prevMin, prevValue, prevJd, 'rise');
    } else if (matchSet && prevValue > 0 && value < 0) {
      set = calcMidSample(item, prevMin, prevValue, prevJd, 'set');
    }
    if (!matchMc && !matchIc) {
      if (!matchRise && matchSet && set.jd > 0) {
        break;
      } else if (!matchSet && matchRise && rise.jd > 0) {
        break;
      }
    }
    items.push(item);
    prevValue = value;
    prevMin = n;
    prevJd = jd;
  }
  if (matchMc && mc.jd > 0) {
    mc = await recalcMinMaxTransitSample(mc, geo, lng, lat, true, multiplier);
  }
  if (matchIc && ic.jd > 0) {
    ic = await recalcMinMaxTransitSample(ic, geo, lng, lat, false, multiplier);
  }
  return [rise, set, mc, ic].filter(item => item.jd > 0);
};

export const calcTransposedObjectTransitionsSimple = async (
  jdStart: number,
  geo: GeoPos,
  lng: number,
  lat: number,
  lngSpeed = 0,
  multiplier = 5,
  filterKeys: string[] = [],
  sampleKey = '',
) => {
  const items = await calcTransposedObjectTransitions(
    jdStart,
    geo,
    lng,
    lat,
    lngSpeed,
    multiplier,
    filterKeys,
    sampleKey,
  );
  return items.map(item => item.toObject());
};

export const calcTransposedGrahaTransition = async (
  jdStart = 0,
  geo: GeoPos,
  grahaPos: GrahaPos,
  transType = '',
  multiplier = 5,
) => {
  const { key, lng, lat, lngSpeed } = grahaPos;
  const refLngSpeed = isNumeric(lngSpeed) ? lngSpeed : 0;
  const filterKeys = ['ic', 'mc', 'rise', 'set'].includes(transType)
    ? [transType]
    : [];
  return await calcTransposedObjectTransitions(
    jdStart,
    geo,
    lng,
    lat,
    refLngSpeed,
    multiplier,
    filterKeys,
    key,
  );
};

export const calcTransposedGrahaTransitions = async (
  jdStart = 0,
  geo: GeoPos,
  grahaPositions: GrahaPos[],
) => {
  const rows = [];
  for (const gp of grahaPositions) {
    const { key, lng, lat, lngSpeed } = gp;
    const refLngSpeed = isNumeric(lngSpeed) ? lngSpeed : 0;
    const items = await calcTransposedObjectTransitions(
      jdStart,
      geo,
      lng,
      lat,
      refLngSpeed,
      5,
      [],
      key,
    );
    rows.push({
      key,
      transitions: items.map(item => {
        return {
          type: item.type,
          jd: item.jd,
          lng,
          alt: item.value,
          after: false,
        };
      }),
    });
  }
  return rows;
};

export const buildGrahaPositionsFromChart = (
  grahaKeys: string[] = [],
  chart: Chart,
): GrahaPos[] => {
  return chart.grahas
    .filter(bg => bg instanceof Object && grahaKeys.includes(bg.key))
    .map(baseGraha => {
      const { key, lat, lng, lngSpeed } = baseGraha;
      return { key, lat, lng, lngSpeed };
    });
};

import * as swisseph from 'swisseph';
import { dmsToDegrees, degAsDms } from './converters';
import {
  calcUtAsync,
  fixedStar2UtAsync,
  fixstar2MagAsync,
  getHouses,
  getAyanamsa,
  fixedStarAsync,
} from './sweph-async';
import { calcJulDate, jdToDateTime } from './date-funcs';
import {
  calcDeclinationFromLngLatEcl,
  calcInclusiveTwelfths,
  calcRectAscension,
  subtractLng360,
} from './math-funcs';
import {
  calcTransitionJd,
  calcJyotishSunRise,
  fetchIndianTimeData,
  SunTransitionData,
  TransitionData,
  calcSunTransJd,
} from './transitions';
import starValues from './settings/star-values';
import asteroidValues from './settings/asteroid-values';
import grahaValues from './settings/graha-values';
import nakshatraValues from './settings/nakshatra-values';
import aprakasaValues from './settings/aprakasa-values';
import upagrahaData from './settings/upagraha-data';
import tithiValues, { calcTithi } from './settings/tithi-values';
import yogaValues, { calcYoga } from './settings/yoga-values';
import karanaData, { calcKarana } from './settings/karana-data';
import varaValues, { calcVara } from './settings/vara-values';
import horaValues from './settings/hora-values';
import ghatiValues from './settings/ghati-values';
import caughadiaData from './settings/caughadia-data';
import muhurtaValues from './settings/muhurta-values';
import ayanamshaValues, {
  matchAyanamshaKey,
  matchAyanamshaNum,
} from './settings/ayanamsha-values';
import kalamData from './settings/kalam-data';
import mrityubhagaData from './settings/mrityubhaga-data';
import rashiValues from './settings/rashi-values';
import arudhaValues from './settings/arudha-values';
import sphutaValues from './settings/sphuta-values';
import induValues from './settings/indu-values';
import greekLots from './settings/greek-lots';
import { GrahaSet, Graha } from './models/graha-set';
import { HouseSet } from './models/house-set';
import { ephemerisPath, ephemerisDefaults } from '../../.config';
import {
  isNumeric,
  notEmptyString,
  validISODateString,
  inRange,
  inRange360,
} from '../../lib/validators';
import { hashMapToObject } from '../../lib/entities';
import { KeyValue } from '../interfaces/key-value';
import { GeoPos } from '../interfaces/geo-pos';
import { IndianTime } from './models/indian-time';
import {
  Chart,
  ObjectMatchSet,
  RashiItemSet,
  NumValueSet,
  ITime,
} from './models/chart';
import { calcDist360, capitalize } from './helpers';
import houseTypeData from './settings/house-type-data';
import { sampleBaseObjects } from './custom-transits';
import { GeoLoc } from './models/geo-loc';
import { calcTransposedGrahaTransitions } from './point-transitions';
import { KeyLng, SynastryAspectMatch } from './interfaces';
import { keyValuesToSimpleObject } from '../../lib/converters';
import { matchSynastryOrbRange } from './calc-orbs';

swisseph.swe_set_ephe_path(ephemerisPath);

// Make user-configurable
swisseph.swe_set_sid_mode(swisseph[ephemerisDefaults.sid_mode], 0, 0);

const degreeToSign = deg => Math.floor(deg / 30) + 1;

const addCycleInclusive = (one = 0, two = 0, radix = 12) => {
  return ((one - 1 + two) % radix) + 1;
};

const subtractCycleInclusive = (one = 0, two = 0, radix = 12) => {
  return ((one - 1 - two + radix) % radix) + 1;
};

/*
@param sunLng:number
@param moonLng:number
*/
export const relativeAngle = (
  sunLng: number,
  moonLng: number,
  multiplier = 1,
) => {
  const mn = ((moonLng - sunLng) * multiplier) % 360;
  return mn < 0 ? 360 + mn : mn;
};

interface DeclinationResult {
  valid: boolean;
  value: number;
  ra?: number;
  distance?: number;
}

export const calcDeclination = async (
  jd: number,
  num: number,
): Promise<DeclinationResult> => {
  const flag =
    swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED | swisseph.SEFLG_EQUATORIAL;
  let data = { valid: false, value: 0, ra: 0, distance: 0 };
  await calcUtAsync(jd, num, flag).catch(async result => {
    if (result instanceof Object) {
      if (!result.error) {
        if (result instanceof Object) {
          const { distance } = result;
          const distVal = isNumeric(distance) ? distance : 0;
          data = {
            valid: true,
            value: result.declination,
            ra: result.rectAscension,
            distance: distVal,
          };
        }
      }
    }
  });
  return data;
};

export const matchSideralMode = (mode: string) => {
  let iflag = swisseph.SEFLG_SWIEPH;
  let sidModeNum = 0;
  if (notEmptyString(mode, 3) && mode !== 'RAW') {
    iflag += swisseph.SEFLG_SIDEREAL;
    const sidModeKey = notEmptyString(mode, 2)
      ? ['SE_SIDM', mode.toUpperCase()].join('_')
      : '';
    if (sidModeKey.length > 8 && swisseph.hasOwnProperty(sidModeKey)) {
      sidModeNum = swisseph[sidModeKey];
    }
  }
  swisseph.swe_set_sid_mode(sidModeNum, 0, 0);
  return iflag;
};

export const calcGrahaPos = async (jd = 0, num = 0, flag = 0) => {
  let data: any = { valid: false };
  const gFlag = swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SPEED + flag;
  const dV = await calcDeclination(jd, num);
  await calcUtAsync(jd, num, gFlag).catch(async result => {
    if (result instanceof Object) {
      if (!result.error) {
        data = {
          ...result,
          declination: dV.value,
          rectAscension: dV.ra,
          valid: true,
        };
      }
    }
  });
  return data;
};

export const calcGrahaPosTopo = async (jd = 0, num = 0) => {
  return await calcGrahaPos(jd, num, swisseph.SEFLG_TOPOCTR);
};

export const fetchHouseDataJd = async (
  jd,
  geo,
  system = 'W',
  mode = 'RAW',
): Promise<HouseSet> => {
  let houseData: any = { jd };
  const iflag = matchSideralMode(mode);

  await getHouses(jd, iflag, geo.lat, geo.lng, system).catch(res => {
    if (res instanceof Object) {
      if (res.house) {
        houseData = res;
        houseData.jd = jd;
      }
    }
  });
  swisseph.swe_set_topo(geo.lng, geo.lat, geo.alt);
  const posData = await calcGrahaPos(jd, -1, 0);
  let ascDeclination = 0;
  let ecliptic = 0;
  let ascRectAscension = 0;
  let mcRectAscension = 0;
  const hasEclipticData = posData instanceof Object;
  const keys = hasEclipticData ? Object.keys(posData) : [];
  if (hasEclipticData && keys.includes('longitude')) {
    ecliptic = posData.longitude;
    ascDeclination = calcDeclinationFromLngLatEcl(
      houseData.ascendant,
      0,
      ecliptic,
    );
    ascRectAscension = calcRectAscension(houseData.ascendant, 0, ecliptic);
    mcRectAscension = calcRectAscension(houseData.mc, 0, ecliptic);
  }
  const extraData = hasEclipticData
    ? { ascDeclination, ecliptic, ascRectAscension, mcRectAscension }
    : {};
  return new HouseSet(houseData, extraData);
};

export const fetchHouseData = async (
  datetime: string,
  geo,
  system = 'W',
): Promise<HouseSet> => {
  let houseData = new HouseSet();
  //swisseph.swe_set_sid_mode(swisseph.SE_SIDM_TRUE_CITRA, 0, 0);
  if (validISODateString(datetime) && geo instanceof Object) {
    const jd = calcJulDate(datetime);
    houseData = await fetchHouseDataJd(jd, geo, system);
  }
  return houseData;
};

const calcUpagrahaPeriods = async (
  startJd: number,
  eighthJd: number,
  geo,
  ayanamshaValue: number,
) => {
  const periods = [];
  for (let i = 0; i < 9; i++) {
    const periodJd = startJd + i * eighthJd;
    const midPeriodJd = startJd + (i + 0.5) * eighthJd;
    const hd = await fetchHouseDataJd(periodJd, geo, 'W');
    const hd2 = await fetchHouseDataJd(midPeriodJd, geo, 'W');
    periods.push({
      startJd: periodJd,
      midJd: midPeriodJd,
      dt: jdToDateTime(periodJd),
      ascendant: subtractLng360(hd.ascendant, ayanamshaValue),
      midAscendant: subtractLng360(hd2.ascendant, ayanamshaValue),
      index: i,
      num: i + 1,
    });
  }
  return periods;
};

export const calcUpagrahas = async (
  datetime,
  geo,
  ayanamshaValue = 0,
  showPeriods = false,
) => {
  const {
    jd,
    startJd,
    sunData,
    periodLength,
    periodHours,
    isDayTime,
    weekDay,
  } = await calcJyotishSunRise(datetime, geo);
  const eighthJd = periodLength / 8;
  const eighth = periodHours / 8;
  const periods = showPeriods
    ? await calcUpagrahaPeriods(startJd, eighthJd, geo, ayanamshaValue)
    : [];
  const sectionKey = isDayTime ? 'daytime' : 'nighttime';

  const upaRow = upagrahaData[sectionKey].find(row => row.day === weekDay);
  const values = [];
  for (const ref of upagrahaData.refs) {
    const partIndex = upaRow.parts.findIndex(b => b === ref.body);
    const parts = partIndex + 1;
    const value = (partIndex + ref.position) * eighthJd;
    const upaJd = value + startJd;
    const hd = await fetchHouseDataJd(upaJd, geo, 'W');
    values.push({
      ...ref,
      parts,
      value,
      jd: upaJd,
      upagraha: subtractLng360(hd.ascendant, ayanamshaValue),
    });
  }
  const out = {
    jd,
    startJd,
    ...sunData,
    periodHours,
    eighth,
    weekDay,
    values,
    isDayTime,
  };
  if (showPeriods) {
    out.periods = periods;
  }
  return out;
};

export const calcHoras = async (datetime: string, geo) => {
  const {
    jd,
    startJd,
    dayLength,
    isDaytime,
    weekDay,
  } = await calcJyotishSunRise(datetime, geo);
  const horaRow = horaValues.find(row => row.day === weekDay);
  const numHoras = horaRow.hora.length;
  const horaLength = dayLength / numHoras;
  const difference = jd - startJd;
  const horaVal = difference / horaLength;
  const horaIndex = Math.floor(horaVal);
  const ruler = horaRow.hora[horaIndex];
  return { jd, horaRow, ruler, index: horaIndex, weekDay, isDaytime };
};

const calcMuhurtaIndexJyotish = (
  jd: number,
  sunData: SunTransitionData,
  dayLength = 0,
  dayBefore = false,
) => {
  const { prevRise, rise } = sunData;
  const dayStart = dayBefore ? prevRise.jd : rise.jd;
  const dayProgress = (jd - dayStart) / dayLength;
  const numMuhurtas = muhurtaValues.length;
  const muhurtaLength = dayLength / numMuhurtas;
  const muhurtaVal = dayProgress * numMuhurtas;
  const index =
    muhurtaVal < numMuhurtas ? Math.floor(muhurtaVal) : numMuhurtas - 1;
  return { jd, dayStart, index, numMuhurtas, muhurtaLength };
};

const calcMuhurtaIndex = async (datetime: string, geo) => {
  const { jd, sunData, dayLength, dayBefore } = await calcJyotishSunRise(
    datetime,
    geo,
  );
  return calcMuhurtaIndexJyotish(jd, sunData, dayLength, dayBefore);
};

const calcMuhurta = async (datetime: string, geo) => {
  const { jd, index } = await calcMuhurtaIndex(datetime, geo);
  const muhurtaRow = muhurtaValues[index];
  return { jd, index, ...muhurtaRow };
};

const calcDayMuhurtas = async (datetime: string, geo) => {
  const { jd, dayStart, index, muhurtaLength } = await calcMuhurtaIndex(
    datetime,
    geo,
  );
  const values = muhurtaValues.map((row, ri) => {
    const mJd = dayStart + ri * muhurtaLength;
    const active = ri === index;
    return { ...row, jd: mJd, dt: jdToDateTime(mJd), active };
  });
  return { jd, values, muhurtaLength, dayStart };
};

/*
	add extra data for each body based on position
@param result:Object
@param body:Object
*/
const processBodyResult = (result: any, body: any) => {
  // for Ketu calculate opposing longitude
  switch (body.calc) {
    case 'opposite':
      result.longitude = (result.longitude + 180) % 360;
      break;
  }

  result.mulaTrikon = body.mulaTrikon;
  const attrKeys = [
    'key',
    'ownSign',
    'charaKarakaMode',
    'exaltedDegree',
    'mulaTrikonDegrees',
    'jyNum',
    'icon',
    'bhuta',
    'guna',
    'caste',
    'dhatu',
    'dosha',
  ];

  attrKeys.forEach(attr => {
    if (body.hasOwnProperty(attr)) {
      result[attr] = body[attr];
    }
  });

  return result;
};

const addGrahaValues = async (data, applyTopo = false) => {
  const gFlag = swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SPEED;
  for (const body of grahaValues) {
    const num = swisseph[body.ref];
    const dV = await calcDeclination(data.jd, body.num);

    await calcUtAsync(data.jd, num, gFlag).catch(async result => {
      if (result instanceof Object) {
        if (!result.error) {
          processBodyResult(result, body);
          data.bodies.push({
            num: num,
            name: body.subkey,
            friends: body.friends,
            neutral: body.neutral,
            enemies: body.enemies,
            ...result,
            declination: dV.value,
            rectAscension: dV.ra,
          });
          if (!data.valid) {
            data.valid = true;
          }
        }
      }
    });
  }
  if (applyTopo) {
    const tFlag = gFlag + swisseph.SEFLG_TOPOCTR;
    for (const body of grahaValues) {
      const num = swisseph[body.ref];
      await calcUtAsync(data.jd, num, tFlag).catch(async result => {
        if (result instanceof Object) {
          if (!result.error) {
            const bd = data.bodies.find(b => b.num === num);
            if (bd instanceof Object) {
              bd.topo = {
                lng: result.longitude,
                lat: result.latitude,
              };
            }
          }
        }
      });
    }
  }

  data = new GrahaSet(data);
  data.matchValues();
};

const addAsteroids = async data => {
  for (const body of asteroidValues) {
    const num = body.num + swisseph.SE_AST_OFFSET;
    await calcUtAsync(data.jd, num, swisseph.SEFLG_SIDEREAL).catch(result => {
      if (result instanceof Object) {
        result.valid = !result.error;
        data.bodies.push({
          refNum: num,
          bodyNum: body.num,
          bodyName: body.name,
          file: body.file,
          ...result,
        });
        if (!data.valid && !result.error) {
          data.valid = true;
        }
      }
    });
  }
};

export const calcMrityubhagaValues = (
  bodies: Array<Graha>,
  ascendant: number,
) => {
  const { orb, mrityu } = mrityubhagaData;
  //const { standard, alternative } = mrityu;
  const { standard } = mrityu;
  const standardRange = standard.values.map(row => {
    let lng = null;
    let sign = null;
    let signIndex = -1;
    let signLng = null;
    let active = false;
    let degree = 0;
    switch (row.graha) {
      case 'as':
        lng = ascendant;
        break;
      default:
        const body = bodies.find(b => b.key === row.graha);
        if (body) {
          lng = body.longitude;
        }
        break;
    }
    if (isNumeric(lng)) {
      signIndex = Math.floor(lng / 30);
      sign = signIndex + 1;
      signLng = lng - signIndex * 30;
      degree = row.degrees[signIndex];
      active = inRange(lng, [degree - orb, degree + orb]);
    }
    return { lng, sign, signLng, degree, active, ...row };
  });
  const altRange = [];
  return { ascendant, standardRange, altRange, bodies };
};

/*
@param datetime:string IsoDate
@param mode:string (all|core|asteroids)
@param showBodyConfig:boolean
*/
export const calcAllBodies = async (
  datetime: string,
  mode = 'all',
  applyTopo = false,
) => {
  const data = { valid: false, jd: 0, bodies: [] };
  if (validISODateString(datetime)) {
    data.jd = calcJulDate(datetime);
    const showCore = mode === 'core' || mode === 'all';
    const showAsteroids = mode === 'asteroids' || mode === 'all';
    if (showCore) {
      await addGrahaValues(data, applyTopo);
    }

    if (showAsteroids) {
      await addAsteroids(data);
    }
  }
  return data;
};

/*
@param jd:number
@param mode:string (all|core)
*/
export const calcAllBodiesJd = async (jd = 0, mode = 'all') => {
  const data = { valid: false, jd, bodies: [] };
  if (jd > 1000) {
    const showCore = mode === 'core' || mode === 'all';
    if (showCore) {
      await addGrahaValues(data, false);
    }
  }
  return data;
};

/*
@param jd:number
@param mode:string (all|core)
*/
export const calcAllBodyLngsJd = async (jd = 0, mode = 'all') => {
  const data = await calcAllBodiesJd(jd, mode);
  if (data.valid) {
    data.bodies = data.bodies.map(bd => {
      return {
        key: bd.key,
        lng: bd.longitude,
      };
    });
  }
  return data;
};

export const calcMrityubhaga = async (datetime: string, geo) => {
  const bodyData = await calcAllBodies(datetime, 'core');
  const { jd, bodies } = bodyData;
  const hd = await fetchHouseDataJd(jd, geo);
  const { ascendant } = hd;
  const md = calcMrityubhagaValues(bodies, ascendant);
  return { jd, dt: datetime, ...md };
};

export const translateBodyConstant = (body: string) => {
  const bodyBase = body.replace(/^SE_/, '').toLowerCase();
  switch (bodyBase) {
    case 'mean_node':
      return 'ra';
    default:
      return bodyBase.substring(0, 2).toLowerCase();
  }
};

export const calcAllTransitionsJd = async (
  jd: number,
  geo,
  jdOffset = 0,
  fullSet = false,
  showLng = false,
  adjustRise = false,
): Promise<Array<TransitionData>> => {
  const baseKeys = ['SE_SUN', 'SE_MOON'];
  const extraKeys = [
    'SE_MERCURY',
    'SE_VENUS',
    'SE_MARS',
    'SE_JUPITER',
    'SE_SATURN',
    'SE_URANUS',
    'SE_NEPTUNE',
    'SE_PLUTO',
    'SE_MEAN_NODE',
  ];
  const bodyKeys = fullSet ? [...baseKeys, ...extraKeys] : baseKeys;
  const bodies: Array<TransitionData> = [];
  let sunRiseJd = 0;
  for (const body of bodyKeys) {
    const num = swisseph[body];
    const isSun = body === 'SE_SUN';
    const refJd = isSun || sunRiseJd === 0 ? jd + jdOffset : sunRiseJd;
    const bodyData = await calcTransitionJd(
      refJd,
      geo,
      num,
      adjustRise,
      true,
      showLng,
    );
    if (isSun) {
      sunRiseJd = bodyData.rise.jd;
    }
    bodies.push({
      num,
      body,
      ...bodyData,
    });
  }
  if (bodyKeys.includes('SE_MEAN_NODE')) {
    const raRow = bodies.find(row => row.num === swisseph.SE_MEAN_NODE);
    if (raRow instanceof Object) {
      const keRow = {
        num: 102,
        body: 'SE_KETU',
        rise: raRow.set,
        set: raRow.rise,
        mc: raRow.ic,
        ic: raRow.mc,
      };
      bodies.push(keRow);
    }
  }
  return bodies;
};

export const calcAllTransitionsFromJd = async (
  jd = 0,
  geo: GeoPos,
  jdOffset = 0,
  showLng = false,
) => {
  const items = await calcAllTransitionsJd(
    jd,
    geo,
    jdOffset,
    true,
    showLng,
    true,
  );
  const transitions: TransitionData[] = items.map(row => {
    const key = translateBodyConstant(row.body);
    return { ...row, key };
  });
  return {
    jd,
    transitions,
    geo,
    chart: null,
  };
};

export const calcAllTransitions = async (
  datetime: string,
  geo: GeoPos,
  jdOffset = 0,
  showLng = false,
) => {
  const jd = calcJulDate(datetime);
  return await calcAllTransitionsFromJd(jd, geo, jdOffset, showLng);
};

export const buildExtendedTransitions = async (
  geo: GeoLoc,
  jd = 0,
  modeRef = 'basic',
  adjustMode = '',
  birthChart: Chart = new Chart(),
) => {
  const adjustRiseBy12 = adjustMode !== 'spot';
  const coreData = await calcAllTransitionsFromJd(jd, geo, 0, adjustRiseBy12);
  const mode = ['basic', 'standard', 'extended'].includes(modeRef)
    ? modeRef
    : 'standard';
  const showSunData = ['standard', 'extended'].includes(mode);
  const showGeoData = ['extended'].includes(mode);
  const sunData = showSunData ? await calcSunTransJd(jd, geo) : null;

  const transitions = coreData.transitions.map(row => {
    const { key, rise, set, mc, ic } = row;
    const item: TransitionData = { key, rise, set, mc, ic };
    if (showGeoData && key === 'su') {
      item.prevRise = sunData.prevRise;
      item.prevSet = sunData.prevSet;
      item.nextRise = sunData.nextRise;
    }
    return item;
  });

  const toTransitSet = (key, tr = null) => {
    const keys = tr instanceof Object ? Object.keys(tr) : [];
    const values = ['rise', 'set', 'mc', 'ic'].map(k => {
      const v = keys.includes(k) ? tr[k] : { jd: 0, lng: 0, after: false };
      return [k, v];
    });
    return { key, ...Object.fromEntries(values) };
  };

  const extraTransitionData = await sampleBaseObjects(jd, geo, birthChart);
  if (extraTransitionData instanceof Object) {
    Object.entries(extraTransitionData.transits).forEach(entry => {
      const [k, tr] = entry;
      if (tr instanceof Object) {
        transitions.push(toTransitSet(k, tr));
      }
    });
  }
  return { jd, transitions, showGeoData, showSunData };
};

export const buildCurrentAndBirthExtendedTransitions = async (
  chart: Chart,
  geo: GeoLoc,
  jd = 0,
  offset = -0.5,
) => {
  const result = await buildExtendedTransitions(
    geo,
    jd + offset,
    'extended',
    '',
    chart,
  );
  const { transitions } = result;
  const gps = chart.bodies.map(({ lng, lat, lngSpeed, key }) => {
    return { lng, lat, lngSpeed, key };
  });
  if (chart.objects instanceof Array) {
    if (chart.sphutas.length > 0) {
      const sphutaSet = chart.sphutas[0];
      const ayaNum = sphutaSet.num;
      const ayanamshaKey = matchAyanamshaKey(ayaNum);
      const aya = chart.ayanamshas.find(row => row.key === ayanamshaKey);
      const sphutaKeys = {
        lotOfFortune: 'lotOfFortune',
        lotOfSpirit: 'lotOfSpirit',
        yogi: 'yogiSphuta',
        avaYogi: 'avayogiSphuta',
        brghuBindu: 'brghuBindu',
      };
      if (aya instanceof Object && sphutaSet instanceof Object) {
        Object.entries(sphutaKeys).forEach(([k1, k2]) => {
          const item = sphutaSet.items.find(item => item.key === k2);
          if (item instanceof Object) {
            const lng = (item.value + aya.value) % 360;
            gps.push({ lng, lat: 0, lngSpeed: 0, key: k1 });
          }
        });
      }
    }
  }
  const ds = await calcTransposedGrahaTransitions(jd + offset, geo, gps);
  const emptyTimeSet = { type: '', jd: 0, after: false };
  const birthTransitions: TransitionData[] = ds
    .filter(
      gSet =>
        gSet instanceof Object && Object.keys(gSet).includes('transitions'),
    )
    .map(gSet => {
      const { key, transitions } = gSet;
      const riseRow = transitions.find(item => item.type === 'rise');
      const setRow = transitions.find(item => item.type === 'set');
      const mcRow = transitions.find(item => item.type === 'mc');
      const icRow = transitions.find(item => item.type === 'ic');
      const rise = riseRow instanceof Object ? riseRow : { ...emptyTimeSet };
      const set = setRow instanceof Object ? setRow : { ...emptyTimeSet };
      const mc = mcRow instanceof Object ? mcRow : { ...emptyTimeSet };
      const ic = icRow instanceof Object ? icRow : { ...emptyTimeSet };
      return { key, rise, set, mc, ic };
    });
  if (offset === -0.5) {
    const extra = await buildCurrentAndBirthExtendedTransitions(
      chart,
      geo,
      jd,
      0.495,
    );
    extra.transitions.forEach(tr => {
      const key = tr.key + '2';
      transitions.push({ ...tr, key });
    });
    extra.birthTransitions.forEach(tr => {
      const key = tr.key + '2';
      birthTransitions.push({ ...tr, key });
    });
  }
  return { transitions, birthTransitions };
};

const calcStarPosJd = async (jd: number, starname: string, mode = '2ut') => {
  const data: any = { valid: false };
  if (isNumeric(jd) && notEmptyString(starname, 2)) {
    const func = mode === 'plain' ? fixedStarAsync : fixedStar2UtAsync;
    await func(
      starname,
      jd,
      swisseph.SEFLG_SWIEPH + swisseph.SEFLG_EQUATORIAL,
    ).catch(result => {
      if (result instanceof Object) {
        if (result.name) {
          data.result = result;
          data.valid = true;
        }
      }
    });
    if (data.valid) {
      await fixstar2MagAsync(starname).catch(out => {
        if (out instanceof Object) {
          if (out.magnitude) {
            data.result.magnitude = out.magnitude;
          }
        }
      });
    }
  }
  return data;
};

export const calcStarPos = async (
  datetime: string,
  starname: string,
  mode = '2ut',
) => {
  const jd = calcJulDate(datetime);
  const data = await calcStarPosJd(jd, starname, mode);
  return { jd, ...data };
};

/*
@param datetime:string isodate
@return Promise<Array<Object>>
*/
export const calcAllStars = async (
  datetime: string,
  nameList: string[] = [],
  mode = '2ut',
) => {
  const data = {
    valid: false,
    jd: calcJulDate(datetime),
    stars: [],
    sample: null,
  };
  const hasCustomList = nameList instanceof Array && nameList.length > 0;
  const starList = hasCustomList ? nameList : starValues;
  if (validISODateString(datetime)) {
    for (const star of starList) {
      const res = await calcStarPosJd(data.jd, star, mode);
      if (res instanceof Object) {
        data.stars.push({ star, ...res });
      }
    }
  }
  data.valid = data.stars.some(row => row.valid);
  const testLine =
    'AA11_page_B73,     ,ICRS,14,39,36.4958,-60,50, 2.309,-3678.06,  482.87, -21.6,742,0   ,  0,    0';
  if (data.valid && hasCustomList) {
    const firstKeys = Object.keys(data.stars[0].result);
    const values = testLine.split(',').map(str => str.trim());
    const entries = values.map((v, i) => {
      const k = i < firstKeys.length ? firstKeys[i] : ['item', i].join('_');
      return [k, v];
    });
    data.sample = Object.fromEntries(entries);
  }
  return data;
};

export const matchNakshatra = (deg: number) => {
  let row: any = { index: -1, num: 0, percent: 0, ruler: '', yoni: -1 };
  const nkVal = deg / (360 / nakshatraValues.length);
  const index = Math.floor(nkVal);
  const percent = (nkVal % 1) * 100;
  if (index < nakshatraValues.length) {
    const nkRow = nakshatraValues[index];
    if (nkRow) {
      row = { index, num: index + 1, percent, ...nkRow };
    }
  }
  return row;
};

export const calcGrahaLng = async (jd = 0, num = 0, flag = 0) => {
  let lng = 0;
  const gFlag = swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SPEED + flag;
  await calcUtAsync(jd, num, gFlag).catch(async result => {
    if (result instanceof Object) {
      if (!result.error) {
        lng = result.longitude;
      }
    }
  });
  return lng;
};

export const calcBodyJd = async (
  jd: number,
  key: string,
  sideralMode = true,
  topoMode = false,
): Promise<Graha> => {
  let data: any = {};
  const body = grahaValues.find(b => b.key === key);
  if (body) {
    const topoFlag = topoMode ? swisseph.SEFLG_TOPOCTR : 0;
    const gFlag = sideralMode
      ? swisseph.SEFLG_SIDEREAL | topoFlag
      : swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED | topoFlag;
    await calcUtAsync(jd, body.num, gFlag).catch(result => {
      if (result instanceof Object) {
        result.valid = !result.error;
        processBodyResult(result, body);
        data = {
          num: body.num,
          name: body.subkey,
          friends: body.friends,
          ...result,
        };
      }
    });
  }
  return new Graha(data);
};

export const calcLngJd = async (jd: number, key: string): Promise<number> => {
  let data: any = { valid: false };
  const body = grahaValues.find(b => b.key === key);
  if (body) {
    //const gFlag = swisseph.SEFLG_TR;
    await calcUtAsync(jd, body.num, 0).catch(result => {
      if (result instanceof Object) {
        data = result;
        data.valid = Object.keys(result).includes('longitude');
      }
    });
  }
  return data.valid ? data.longitude : 0;
};

export const calcLngsJd = async (
  jd: number,
  keys: string[] = [],
  ayanamshaValue = 0,
): Promise<KeyLng[]> => {
  const gKeys =
    keys.length < 2 ? ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa'] : keys;
  const items: KeyLng[] = [];
  for (const key of gKeys) {
    const lng = await calcLngJd(jd, key);
    items.push({ key, lng: subtractLng360(lng, ayanamshaValue) });
  }
  return items;
};

export const calcBodiesJd = async (jd: number, keys: string[] = []) => {
  const bodies: Graha[] = [];
  if (keys.length > 0) {
    for (const key of keys) {
      const body = await calcBodyJd(jd, key, true);
      bodies.push(body);
    }
  }
  return bodies;
};

const calcSunJd = async (jd: number, sideralMode = true) =>
  calcBodyJd(jd, 'su', sideralMode);

export const calcAyanamsha = async (
  jd: number,
  key = 'true_citra',
): Promise<number> => {
  const iflag = swisseph.SEFLG_SIDEREAL;
  const row = ayanamshaValues.find(r => r.key === key);
  if (row instanceof Object) {
    const { value } = row;
    swisseph.swe_set_sid_mode(value, 0, 0);
    const result = getAyanamsa(jd, iflag);
    if (result instanceof Object) {
      const { ayanamsa } = result;
      if (isNumeric(ayanamsa)) {
        return ayanamsa;
      }
    }
  }
  return 0;
};
const calcAyanamshas = async (
  jd: number,
  matchedNum = 0,
): Promise<Array<KeyValue>> => {
  const iflag = swisseph.SEFLG_SIDEREAL;
  return ayanamshaValues
    .filter(row => matchedNum < 1 || matchedNum === row.value)
    .map(row => {
      const { key, value } = row;
      swisseph.swe_set_sid_mode(value, 0, 0);
      const result = value !== 0 ? getAyanamsa(jd, iflag) : { ayanamsa: 0 };
      const { ayanamsa } = result;
      return {
        key,
        value: ayanamsa,
      };
    });
};

export const calcBaseLngSetJd = async (
  jd = 0,
  geo: GeoLoc,
  hasGeo = true,
  ayanamshaKey = 'true_citra',
) => {
  const ayanamsha = await calcAyanamsha(jd, ayanamshaKey);
  const bd = await calcAllBodyLngsJd(jd, 'core');
  if (hasGeo) {
    const hd = await fetchHouseDataJd(jd, geo, 'W');
    bd.bodies.push({ key: 'as', lng: hd.ascendant });
    bd.bodies.push({ key: 'ds', lng: (hd.ascendant + 180) % 360 });
  }
  return {
    jd,
    ayanamsha,
    geo,
    birth: keyValuesToSimpleObject(bd.bodies, 'lng'),
  };
};

export const calcMoonDataJd = async (
  jd: number,
  ayanamshaKey = 'true_citra',
) => {
  const moon = await calcBodyJd(jd, 'mo', true);
  const sun = await calcBodyJd(jd, 'su', true);
  const ayanamsha = await calcAyanamsha(jd, ayanamshaKey);
  const angle = (moon.lng + 360 - sun.lng) % 360;
  const waxing = angle <= 180;
  const lng = subtractLng360(moon.lng, ayanamsha);
  const sunLng = subtractLng360(sun.lng, ayanamsha);
  return {
    moon: moon.lng,
    sun: sun.lng,
    lng,
    sunLng,
    nakshatra27: Math.floor(lng / (360 / 27)) + 1,
    ayanamsha,
    angle,
    waxing,
  };
};

const calcGrahaSet = async (datetime, geo: any = null, applyTopo = false) => {
  if (applyTopo && geo instanceof Object) {
    swisseph.swe_set_topo(geo.lng, geo.lat, geo.alt);
  }
  const bodyData = await calcAllBodies(datetime, 'core', applyTopo);
  return new GrahaSet(bodyData);
};

const matchInduVal = (houseNum: number) => {
  const matchedGraha = rashiValues.find(r => r.num === houseNum);
  let indu = {
    graha: '',
    value: 0,
    houseNum: 0,
  };
  if (matchedGraha) {
    const induRow = induValues.find(v => v.graha === matchedGraha.ruler);
    if (induRow) {
      indu = { ...induRow, houseNum };
    }
  }
  return indu;
};

const calcVarnadaLagna = (data, houseData) => {
  const lagnaSign = degreeToSign(houseData.ascendant);
  const horaSign = degreeToSign(data.horaLagna);
  const lagnaEven = lagnaSign % 2 === 0;
  const horaEven = horaSign % 2 === 0;
  const lagnaSign2 = lagnaEven ? 12 - lagnaSign + 1 : lagnaSign;
  const horaSign2 = horaEven ? 12 - horaSign + 1 : horaSign;
  const bothSame = lagnaEven === horaEven;
  const ascendantWithinDegree = houseData.ascendant % 30;
  const varnadaSignMultiplier = bothSame
    ? addCycleInclusive(horaSign2, lagnaSign2, 12)
    : subtractCycleInclusive(lagnaSign2, horaSign2, 12);
  return (varnadaSignMultiplier - 1) * 30 + ascendantWithinDegree;
};

const addSphutaData = (
  grahaSet: GrahaSet,
  houseData,
  iTime,
  upagrahas,
  sunAtSunRise,
) => {
  const data: any = { grahaSet };
  const grahaLngs = grahaSet.longitudes();
  data.houseSign = Math.floor(houseData.ascendant / 30) + 1;
  const moon = grahaSet.moon();

  data.sriLagna =
    ((moon.nakshatra.percent / 100) * 360 + houseData.ascendant) % 360;

  const houseSignPlusNine = ((data.houseSign - 1 + (9 - 1)) % 12) + 1;
  const lagnaInduRow = matchInduVal(houseSignPlusNine);

  const moonSignPlusNine = ((moon.sign - 1 + (9 - 1)) % 12) + 1;

  const moonInduRow = matchInduVal(moonSignPlusNine);

  const induLagnaSign =
    ((lagnaInduRow.value + moonInduRow.value + moon.sign) % 12) - 1;
  data.induLagna = (induLagnaSign - 1) * 30 + grahaSet.moon().withinSign;

  data.ghatiLagna = (iTime.ghatiVal() * 30 + sunAtSunRise.longitude) % 360;

  const bhava = iTime.ghatiVal() / 5;

  data.bhavaLagna = (sunAtSunRise.lng + bhava * 30) % 360;
  //data.ghatiAsDegree = indianTimeData.ghatiVal * 6;

  data.horaLagna = (sunAtSunRise.lng + iTime.progress() * 720) % 360;

  data.varnadaLagna = calcVarnadaLagna(data, houseData);

  data.yogiSphuta = grahaSet.calcYogiSphuta();

  const yogiSphutaNk = matchNakshatra(data.yogiSphuta);
  data.yogi = yogiSphutaNk.ruler;
  data.avayogiSphuta = (data.yogiSphuta + 560 / 3) % 360;
  const avayogiSphutaNk = matchNakshatra(data.avayogiSphuta);
  data.avayogi = avayogiSphutaNk.ruler;
  data.bijaSphuta = grahaSet.calcBijaSphuta();
  data.ksetraSphuta = grahaSet.calcKsetraSphuta();
  // The tithi of result of = ceiling(mod(mod((Moon's degree-Sun's degree)*5,360)/12,15),1)

  // prāṅasphuta    -> my chart= 156.55     -> formula= ((Lagna's degree x 5)+Gulika's degree) / mod 360
  const gulika = upagrahas.values.find(row => row.key === 'gu');
  data.pranaSphuta = (houseData.ascendant * 5 + gulika.upagraha) % 360;

  // formula= ((Moon's degree x 8)+Gulika's degree) / mod 360
  data.dehaSphuta = (grahaLngs.mo * 8 + gulika.upagraha) % 360;

  //mṛtusphuta     -> my chart= 321.899999 -> formula= ((Gulika's degree x 7)+Sun's degree) / mod 360
  data.mrtuSphuta = (gulika.upagraha * 7 + grahaLngs.su) % 360;

  // trisphuta      -> my chart= 178.52     -> formula= Prāṅasphuta + Dehasphuta + Mṛtusphuta / mod 360
  data.triSphuta = (houseData.ascendant + grahaLngs.mo + gulika.upagraha) % 360;

  // catusphuta     -> my chart= 251.73     -> formula= Trisphuta + Sun's degree / mod 360
  data.catuSphuta = (data.triSphuta + grahaLngs.su) % 360;

  // pañcasphuta    -> my chart= 18.35      -> formula= Catusphuta + Rahu's degree / mod 360
  data.pancaSphuta = (data.catuSphuta + grahaLngs.ra) % 360;

  // bṛghu bindu    -> my chart= 189.5      -> formula= Version1=(Moon degree+Rahu degree) / 2, counting from Rahu --- Version2=(Moon degree+Rahu degree) / 2 (shortest distance) less 180
  data.brghuBindu = ((grahaLngs.mo + grahaLngs.ra) / 2) % 360;
  data.sunLngAtSunRise = sunAtSunRise.lng;
  return data;
};

export const calcSphutaData = async (datetime: string, geo) => {
  const grahaSet = await calcGrahaSet(datetime);
  const houseData = await fetchHouseData(datetime, geo);
  const upagrahas = await calcUpagrahas(datetime, geo);
  const indianTimeData = await fetchIndianTimeData(datetime, geo);
  const sunAtSunRise = await calcSunJd(indianTimeData.dayStart(), false);

  const data = addSphutaData(
    grahaSet,
    houseData,
    indianTimeData,
    upagrahas,
    sunAtSunRise,
  );
  return { ...data };
};

export const expandWholeHouses = (startLng = 0) => {
  const houses = [startLng];
  for (let i = 1; i < 12; i++) {
    houses.push((startLng + i * 30) % 360);
  }
  return houses;
};

export const getFirstHouseLng = (houseData: HouseSet) => {
  return houseData.count() > 0 && !isNaN(houseData.ascendant)
    ? Math.floor(houseData.houses[0] / 30) * 30
    : 0;
};

const matchDefaultAyanamshaItem = (ayanamshas: KeyValue[], key = '') => {
  const ayanamsha = {
    value: 0,
    key: '',
  };
  if (notEmptyString(key, 3) && key !== 'top') {
    const aRow = ayanamshas.find(a => a.key === key);
    if (aRow) {
      ayanamsha.value = aRow.value;
      ayanamsha.key = key;
    }
  }
  return ayanamsha;
};

const addIndianNumericAndStringValues = (chartData, chart: Chart) => {
  chartData.numValues.push({
    key: 'sunMoonAngle',
    value: chart.sunMoonAngle,
  });
  chartData.numValues.push({
    key: 'tithi',
    value: chart.tithi.num,
  });
  chartData.numValues.push({
    key: 'karana',
    value: chart.karana.num,
  });
  chartData.numValues.push({
    key: 'yoga',
    value: chart.yoga.num,
  });
  chartData.stringValues.push({
    key: 'tithiLord',
    value: chart.tithi.lord,
  });
  chartData.stringValues.push({
    key: 'karanaLord',
    value: chart.karana.ruler,
  });
  chartData.stringValues.push({
    key: 'yogaLord',
    value: chart.yoga.ruler,
  });
  return chartData;
};

const addUpapadaSecondAndLord = (
  rashiSets: Array<RashiItemSet>,
  grahaSet: GrahaSet,
  sps: NumValueSet,
  ayanamshaNum = 27,
) => {
  const rashiSet = rashiSets.find(rs => rs.num === ayanamshaNum);
  if (rashiSet instanceof Object) {
    const rashiHouse12 = rashiSet.items.find(r => r.houseNum === 12);
    const nextArudhaInHouse = rashiHouse12.arudhaInHouse + 1;
    const upapadaSecond = nextArudhaInHouse > 12 ? 1 : nextArudhaInHouse;
    sps.items.push({
      key: 'upapadaSecond',
      value: upapadaSecond,
    });
    const upapadaLord = grahaSet.bodies.find(
      b => b.key === rashiHouse12.arudhaLord,
    );
    if (upagrahaData instanceof Object) {
      sps.items.push({
        key: 'upapadaLord',
        value: upapadaLord.lng,
      });
    }
  }
};

const mergeExtraDataSetsByAyanamsha = (
  key: string,
  chart: Chart,
  objectSets: ObjectMatchSet[],
  ayanamshas: KeyValue[],
  grahaSet: GrahaSet,
  sphutaSet: NumValueSet[],
  rashiSets: RashiItemSet[],
) => {
  const ar = ayanamshas.find(a => a.key === key);
  if (ar) {
    const aya = ayanamshaValues.find(av => av.key === ar.key);
    const ayaItem = {
      ...ar,
      num: aya.value,
      name: aya.name,
    };
    chart.setAyanamshaItem(ayaItem);
    chart.bodies.forEach(gr => {
      gr.setAyanamshaItem(ayaItem);
    });
    const sps = sphutaSet.find(sp => sp.num === ayaItem.num);
    greekLots.forEach(lot => {
      const getMethod = 'lotOf' + capitalize(lot.key);
      if (sps instanceof Object) {
        const spItem = {
          key: getMethod,
          value: chart[getMethod],
        };
        sps.items.push(spItem);
      }
    });
    addUpapadaSecondAndLord(rashiSets, grahaSet, sps, ayaItem.num);
    const objSet = objectSets.find(os => os.num === ayaItem.num);
    if (objSet) {
      const extraObjects = chart.matchLords();

      Object.keys(houseTypeData).forEach(houseType => {
        const getMethod = houseType.replace(/s$/, 'Rulers');
        extraObjects.push({
          key: [houseType, 'ruler'].join('_'),
          type: 'graha',
          value: chart[getMethod],
        });
      });
      extraObjects.push({
        key: 'yogaKaraka',
        type: 'graha',
        value: chart.yogaKaraka,
      });
      objSet.items = objSet.items.concat(extraObjects);
    }
  }
};

const addSphutasAndBaseObjects = (
  grahaSet: GrahaSet,
  hdW: HouseSet,
  indianTimeData: IndianTime,
  upagrahas: KeyValue[],
  sunAtSunRise,
) => {
  const sphutaObj = addSphutaData(
    grahaSet,
    hdW,
    indianTimeData,
    upagrahas,
    sunAtSunRise,
  );

  const excludeKeys = ['grahaSet', 'houseSign'];

  const sphutas = Object.entries(sphutaObj)
    .filter(
      entry => excludeKeys.includes(entry[0]) === false && isNumeric(entry[1]),
    )
    .map(entry => {
      const [key, value] = entry;
      return {
        key,
        value,
      };
    });
  const yogiAvayogiKeys = ['yogi', 'avayogi'];
  const objects = Object.entries(sphutaObj)
    .filter(entry => yogiAvayogiKeys.includes(entry[0]))
    .map(entry => {
      const [key, value] = entry;
      const gr = grahaSet.bodies.find(b => b.key === value);
      let refVal = -1;
      if (gr) {
        refVal = gr.lng;
      }
      return {
        key,
        type: 'graha',
        value,
        refVal,
      };
    });
  return { sphutas, objects };
};

export const coreGrahaKeys = (fullMode = false) => {
  const headKeys = [
    'num',
    'key',
    'lng',
    'lat',
    'lngSpeed',
    'topo',
    'declination',
    'rectAscension',
  ];
  const extraKeys = fullMode
    ? [
        'sign',
        'nakshatra',
        'ruler',
        'relationship',
        'isOwnSign',
        'isMulaTrikon',
        'charaKaraka',
        'house',
        'ownHouses',
        'padaNum',
        'percent',
        'akshara',
        'isExalted',
        'isDebilitated',
      ]
    : [];
  const setKeys = ['transitions', 'variants'];
  return [...headKeys, ...extraKeys, ...setKeys];
};

const cleanGraha = (graha: Graha) => {
  const mp = new Map<string, any>();
  coreGrahaKeys(true).forEach(k => {
    switch (k) {
      case 'nakshatra':
        mp.set(k, {
          num: graha.nakshatra.num,
          within: graha.nakshatra.within,
        });
        break;
      case 'relationship':
        mp.set(k, graha.relationship.compound);
        break;
      default:
        mp.set(k, graha[k]);
        break;
    }
  });
  return hashMapToObject(mp);
};

const matchRashis = (houseData, bodyData: GrahaSet, corrected = false) => {
  return houseData.houses.map((deg, houseIndex) => {
    const houseSignIndexFloor = Math.floor((deg % 360) / 30);
    const houseSignIndex =
      houseSignIndexFloor < 0
        ? 0
        : houseSignIndexFloor >= 12
        ? 11
        : houseSignIndexFloor;
    const rashiRow = rashiValues[houseSignIndex];
    // Ensure index is between 0 and 11
    const graha =
      rashiRow instanceof Object
        ? bodyData.bodies.find(b => b.key === rashiRow.ruler)
        : null;
    const houseNum = houseIndex + 1;
    const houseSignDiff = (houseSignIndex - houseIndex + 12) % 12;
    //const houseSignNum = houseSignIndex + 1;
    let lordInHouse = -1;
    //let lordInSign = -1;
    if (graha instanceof Object) {
      //const grLng = corrected ? graha.lng : graha.longitude;
      lordInHouse = graha.house;
      //lordInSign = Math.floor(grLng / 30) + 1;
    }
    /* const diff = lordInHouse + houseNum;
    const houseLordCount = diff <= 12 ? diff : (diff % 12) + 1; */
    const houseLordCount = calcInclusiveTwelfths(lordInHouse, houseNum);

    const arudhaIndex = (lordInHouse - 1 + (houseLordCount - 1)) % 12;
    //const arudhaSignIndex = (lordInSign + signCount) % 12;
    //const arudhaHouseIndex = houseData.houses.indexOf(arudhaSignIndex * 30);
    let arudhaInHouse = arudhaIndex + 1;
    const plus7 = houseNum + 6;
    const plus7House = plus7 <= 12 ? plus7 : plus7 % 12;
    let mode = 'standard';
    if (arudhaInHouse === houseNum || arudhaInHouse === plus7House) {
      arudhaInHouse -= 3;
      mode = '-3';
      if (arudhaInHouse < 1) {
        arudhaInHouse += 12;
      }
    }
    //const arudhaSignIndex = (lordInSign - 1 + (houseLordCount - 1)) % 12;
    const arudhaSignIndex = (arudhaInHouse - 1 + houseSignDiff + 12) % 12;
    const arudhaInSign = arudhaSignIndex + 1;
    const arudhaLord = rashiValues[arudhaSignIndex].ruler;
    return {
      houseNum,
      sign: rashiRow.num,
      lordInHouse,
      arudhaInHouse,
      arudhaInSign,
      arudhaLord,
    };
  });
};

const calcCompactVariantSet = (
  ayanamsha: KeyValue,
  grahaSet: GrahaSet,
  hdP: HouseSet,
  indianTimeData: IndianTime,
  upagrahas,
  sunAtSunRise,
  fetchFull = true,
  addExtraSets = true,
) => {
  const applyAyanamsha = ayanamsha.value !== 0;
  const shouldCalcVariants = (fetchFull || applyAyanamsha) && addExtraSets;
  if (applyAyanamsha) {
    grahaSet.bodies = grahaSet.bodies.map(b => {
      b.lng = subtractLng360(b.lng, ayanamsha.value);
      if (fetchFull) {
        b.topo.lng = subtractLng360(b.topo.lng, ayanamsha.value);
      }
      return b;
    });
    hdP.ascendant = subtractLng360(hdP.ascendant, ayanamsha.value);
    hdP.mc = subtractLng360(hdP.mc, ayanamsha.value);

    if (hdP.houses.length > 0) {
      hdP.houses = hdP.houses.map(h => {
        return subtractLng360(h, ayanamsha.value);
      });
    }
    sunAtSunRise.lng = subtractLng360(sunAtSunRise.lng, ayanamsha.value);
  }

  const firstHouseLng = getFirstHouseLng(hdP);

  const wHouses = expandWholeHouses(firstHouseLng);
  const hdW = new HouseSet({ ...hdP, houses: wHouses });
  grahaSet.mergeHouseData(hdW, true);
  grahaSet.matchValues();
  const houses = [{ system: 'W', values: [firstHouseLng] }];
  if (fetchFull) {
    houses.unshift({ system: 'P', values: hdP.houses.slice(0, 6) });
  }
  const houseData = { ...hdP, houses };
  const grahas = grahaSet.bodies.map(cleanGraha);
  const { sphutas, objects } = shouldCalcVariants
    ? addSphutasAndBaseObjects(
        grahaSet,
        hdW,
        indianTimeData,
        upagrahas,
        sunAtSunRise,
      )
    : { sphutas: [], objects: [] };

  const rashis = matchRashis(hdW, grahaSet, true);
  const numValues = [];
  return {
    grahas,
    sphutas,
    ...houseData,
    numValues,
    objects,
    rashis,
  };
};

const mapToVariantMap = (gr: any, ayanamsaNum: number) => {
  const variant: Map<string, any> = new Map();
  if (gr instanceof Object) {
    variant.set('num', ayanamsaNum);
    variant.set('key', gr.key);
    variant.set('sign', gr.sign);
    variant.set('house', gr.house);
    const compRel =
      gr.relationship instanceof Object
        ? gr.relationship.compound
        : gr.relationship;
    variant.set('relationship', compRel);
    variant.set('nakshatra', gr.nakshatra.num);
    variant.set('charaKaraka', gr.charaKaraka);
  }
  return variant;
};

const mapToVariant = (mp: Map<string, any>) => {
  const obj = Object.fromEntries(mp);
  const { num, sign, house, nakshatra, relationship, charaKaraka } = obj;
  return { num, sign, house, nakshatra, relationship, charaKaraka };
};

const matchBodyLng = (key, bodies, retVal = -1) => {
  const graha = bodies.find(b => b.key === key);
  if (graha) {
    return graha.longitude;
  }
  return retVal;
};

const cleanBodyObj = (body: any) => {
  const mp = new Map<string, any>();
  if (body instanceof Object) {
    const objKeys = Object.keys(body);
    coreGrahaKeys(false).forEach(k => {
      if (objKeys.includes(k)) {
        mp.set(k, body[k]);
      }
    });
  }
  return hashMapToObject(mp);
};

const mapUpagraha = obj => {
  const { key, upagraha } = obj;
  return {
    key,
    value: upagraha,
  };
};

export const calcCompactChartData = async (
  datetime: string,
  geo: GeoPos,
  ayanamsaKey = '',
  topKeys = [],
  tzOffset = 0,
  fetchFull = true,
  addExtraSets = true,
) => {
  const grahaSet = await calcGrahaSet(datetime, geo, fetchFull);
  const { jd } = grahaSet;
  const dayFracOffset = tzOffset / 86400;
  const dayStartJd = Math.floor(jd + 0.5) - 0.5 - dayFracOffset;
  const transitions = await calcAllTransitionsJd(dayStartJd, geo, 0, fetchFull);
  grahaSet.mergeTransitions(transitions);
  const matchedAyaNum = fetchFull
    ? 0
    : topKeys.length === 1
    ? matchAyanamshaNum(topKeys[0])
    : notEmptyString(ayanamsaKey, 5)
    ? matchAyanamshaNum(ayanamsaKey)
    : 0;

  const ayanamshas = await calcAyanamshas(jd, matchedAyaNum);
  const ayanamsha = matchDefaultAyanamshaItem(ayanamshas, ayanamsaKey);
  const hdP = await fetchHouseData(datetime, geo, 'P');
  const upagrahas = await calcUpagrahas(datetime, geo, ayanamsha.value);
  const indianTimeData = await fetchIndianTimeData(datetime, geo, tzOffset);
  grahaSet.mergeSunTransitions(indianTimeData.sunData());
  const sunAtSunRise = await calcSunJd(indianTimeData.dayStart(), false);
  const calcVariants = ayanamsaKey === 'top';
  const rashiSets = [];
  const {
    grahas,
    sphutas,
    ascendant,
    mc,
    vertex,
    houses,
    numValues,
    objects,
    rashis,
  } = calcCompactVariantSet(
    ayanamsha,
    grahaSet,
    hdP,
    indianTimeData,
    upagrahas,
    sunAtSunRise,
    fetchFull,
    addExtraSets,
  );
  const variants: Array<Map<string, any>> = fetchFull
    ? grahaSet.bodies.map(gr => mapToVariantMap(gr, 0))
    : [];
  const objectSets: Array<ObjectMatchSet> = [];
  const sphutaSet = [];
  const coreAyanamshas =
    topKeys.length > 0 ? topKeys : ['true_citra', 'lahiri', 'krishnamurti'];
  // arudha and greek lots only available for this ayanamsha
  const extraDataAyanamshas = ['true_citra'];
  const { ecliptic, ascDeclination, ascRectAscension, mcRectAscension } = hdP;
  if (calcVariants) {
    let prevAyaVal = 0;
    coreAyanamshas.forEach(ak => {
      const ar = ayanamshas.find(a => a.key === ak);
      if (ar) {
        // apply difference from last ayanamsha offset
        ayanamsha.value = ar.value - prevAyaVal;
        ayanamsha.key = ak;
        prevAyaVal = ar.value;
        const aya = ayanamshaValues.find(a => a.key === ak);
        if (aya instanceof Object) {
          const av = calcCompactVariantSet(
            ayanamsha,
            grahaSet,
            hdP,
            indianTimeData,
            upagrahas,
            sunAtSunRise,
            fetchFull,
          );
          av.grahas.forEach(gr => {
            const variant = mapToVariantMap(gr, aya.value);
            variants.push(variant);
          });
          if (addExtraSets) {
            sphutaSet.push({ num: aya.value, items: av.sphutas });
            objectSets.push({ num: aya.value, items: av.objects });
            if (extraDataAyanamshas.includes(ak)) {
              rashiSets.push({ num: aya.value, items: av.rashis });
            }
          }
        }
      }
    });
  } else if (addExtraSets) {
    const aya = ayanamshaValues.find(a => a.key === ayanamsaKey);
    if (aya instanceof Object) {
      sphutaSet.push({ num: aya.value, items: sphutas });
      rashiSets.push({ num: aya.value, items: rashis });
      objectSets.push({ num: aya.value, items: objects });
    }
  }

  const chartData = {
    jd,
    datetime,
    geo,
    grahas: grahas.map(gr => {
      gr.variants = variants
        .filter(v => v.get('key') === gr.key)
        .map(mapToVariant);
      return cleanBodyObj(gr);
    }),
    ascendant,
    ecliptic,
    ascDeclination,
    ascRectAscension,
    mcRectAscension,
    mc,
    vertex,
    houses,
    indianTime: indianTimeData.toValues(),
    ayanamshas,
    upagrahas: upagrahas.values.map(mapUpagraha),
    sphutas: sphutaSet.filter(nvs => nvs.items.length > 0),
    numValues,
    stringValues: [],
    objects: objectSets,
    rashis: rashiSets,
  };
  const chart = new Chart(chartData);
  extraDataAyanamshas.forEach(ak => {
    mergeExtraDataSetsByAyanamsha(
      ak,
      chart,
      objectSets,
      ayanamshas,
      grahaSet,
      sphutaSet,
      rashiSets,
    );
  });
  if (addExtraSets) {
    addIndianNumericAndStringValues(chartData, chart);
  }
  return chartData;
};

const matchTithiNum = (bodies, multiplier = 1) => {
  const sunMoonAngle = relativeAngle(
    matchBodyLng('su', bodies, 0),
    matchBodyLng('mo', bodies, 0),
    multiplier,
  );
  const tithiVal = sunMoonAngle / (360 / 30);
  return Math.floor(tithiVal) + 1;
};

export const calcBaseChart = async (
  dt = '',
  geo: GeoPos,
  fetchFull = false,
  extraSets = false,
): Promise<Chart> => {
  const cd = await calcCompactChartData(
    dt,
    geo,
    'top',
    ['true_citra'],
    0,
    fetchFull,
    extraSets,
  );
  return new Chart(cd);
};

/*
Calculate Aprakasa values from the the sun's longitude
*/
const calcAprakasa = (sunLng = 0) => {
  const items = [];

  let prevVal = null;
  aprakasaValues.forEach(row => {
    let refVal = 0;
    const { ref } = row;
    switch (ref.obj) {
      case 'su':
        refVal = sunLng;
        break;
      case '-':
        refVal = prevVal;
        break;
    }
    if (ref.op === '-') {
      refVal = 0 - refVal;
    }
    const value = dmsToDegrees(row.offset) + refVal;
    prevVal = value;
    items.push({
      value,
      num: row.num,
    });
  });
  return items;
};

/*
@param Array<Object>
@return Array<Object>
*/
const calcAprakasaValues = bodies => {
  const sun = bodies.find(b => b.key === 'su');
  if (sun instanceof Object) {
    return calcAprakasa(sun.longitude);
  } else {
    return [];
  }
};

/*
@param datetime:string isodate
@param geo: latLng
@param system:string
*/
export const calcBodiesInHouses = async (
  datetime,
  geo,
  system = 'W',
  ayanamshaNum = 27,
) => {
  const jd = calcJulDate(datetime);
  let ayaVal = 0;
  const matchedRow = ayanamshaValues.find(item => item.value == ayanamshaNum);
  const ayaRow = matchedRow instanceof Object ? matchedRow : ayanamshaValues[0];
  if (ayanamshaNum > 0) {
    matchSideralMode(ayaRow.key);
    const { ayanamsa } = getAyanamsa(jd, swisseph.SEFLG_SIDEREAL);
    ayaVal = ayanamsa;
  }

  const ayanamshaItem = {
    num: ayanamshaNum,
    value: ayaVal,
    name: ayaRow.name,
    key: ayaRow.key,
  };
  const grahaSet = await calcGrahaSet(datetime, geo, true);
  if (ayaVal > 0) {
    grahaSet.bodies.forEach(body => {
      body.setAyanamshaItem(ayanamshaItem);
    });
  }

  //
  const houseData = await fetchHouseDataJd(jd, geo, system, ayanamshaItem.key);

  grahaSet.mergeHouseData(houseData);
  grahaSet.matchRelationships();

  const apValues = calcAprakasaValues(grahaSet.bodies);
  const upagrahas = await calcUpagrahas(datetime, geo);
  const rashis = matchRashis(houseData, grahaSet);

  return { ...grahaSet, ...houseData, aprakasa: apValues, upagrahas, rashis };
};

export const calcCoreGrahaPositions = async (
  datetime = null,
  geo: GeoPos,
  ayanamshaKey = 'true_citra',
  addAscendant = true,
) => {
  const jd = calcJulDate(datetime);
  let ayaVal = 0;
  const matchedRow = ayanamshaValues.find(item => item.key == ayanamshaKey);
  const ayaRow = matchedRow instanceof Object ? matchedRow : ayanamshaValues[0];
  const grahaSet = await calcGrahaSet(datetime, geo, false);
  if (matchedRow instanceof Object) {
    matchSideralMode(ayaRow.key);
    const { ayanamsa } = getAyanamsa(jd, swisseph.SEFLG_SIDEREAL);
    ayaVal = ayanamsa;
  }
  const ayanamshaItem = {
    value: ayaVal,
    key: ayaRow.key,
  };
  const bodies = grahaSet.bodies.map(b => {
    const { key, lng } = b;
    return { key, lng: subtractLng360(lng, ayaVal) };
  });
  if (addAscendant) {
    const houseData = await fetchHouseData(datetime, geo, 'W');
    const ascendantLng = subtractLng360(houseData.ascendant, ayaVal);

    bodies.push({ key: 'as', lng: ascendantLng });
  }
  return { bodies, ayanamsha: ayanamshaItem };
};

/*
@param datetime: string isodate
@param geo: latLng
@param system: string
	*/
export const calcVargas = async (datetime, geo, system = 'W') => {
  const grahaSet = await calcGrahaSet(datetime);

  const houseData = await fetchHouseData(datetime, geo, system);

  grahaSet.mergeHouseData(houseData);

  const vargas = grahaSet.getFullVargaSet(houseData.ascendant);
  return { jd: houseData.jd, datetime, geo, vargas };
};

export const defaultAspectGrahaKeys = [
  'su',
  'mo',
  'ma',
  'me',
  'ju',
  've',
  'sa',
  'as',
  'ds',
];

export const calcAllAspects = (
  c1: Chart,
  c2: Chart,
  grahaKeys1: string[] = [],
  grahaKeys2: string[] = [],
) => {
  const aspects = [];
  const keys1 = grahaKeys1.length > 0 ? grahaKeys1 : defaultAspectGrahaKeys;
  const keys2 = grahaKeys2.length > 0 ? grahaKeys2 : defaultAspectGrahaKeys;
  keys1.forEach(k1 => {
    keys2.forEach(k2 => {
      const gr1 = c1.graha(k1);
      const gr2 = c2.graha(k2);
      const angle = relativeAngle(gr1.longitude, gr2.longitude);
      aspects.push({
        k1,
        k2,
        value: angle,
      });
    });
  });
  return aspects;
};

export const calcAspectMatches = (
  c1: Chart,
  c2: Chart,
  grahaKeys1: string[] = [],
  grahaKeys2: string[] = [],
  orbMap = null,
  aspectDegs: number[] = [0, 90, 120, 180],
  ascAspectDegs = [0, 30, 60, 90, 120, 150, 180],
): SynastryAspectMatch[] => {
  const aspects = calcAllAspects(c1, c2, grahaKeys1, grahaKeys2);
  return aspects
    .map(asp => {
      const aDegs =
        asp.k1 === 'as' && asp.k2 === 'as' ? ascAspectDegs : aspectDegs;
      return aDegs
        .map(deg => {
          // const row = matchAspectRowByDeg(deg);
          const orbRow = matchSynastryOrbRange(asp.k1, asp.k2, deg, orbMap);
          const ranges = orbRow.ranges
            .map(range => {
              const [first, second] = range;
              const midDeg =
                first < second
                  ? (first + second) / 2
                  : (first - 360 + second) / 2;
              return {
                valid: inRange360(asp.value, range),
                distance: calcDist360(midDeg, asp.value),
                range,
              };
            })
            .filter(r => r.valid);
          return {
            ranges,
            orb: orbRow.orb,
            deg,
            ...asp,
          };
        })
        .filter(r => r.ranges.length > 0)
        .map(r => {
          const { distance } = r.ranges[0];
          const { deg, k1, k2, orb, value } = r;
          return {
            deg,
            k1,
            k2,
            orb,
            value,
            distance,
          };
        });
    })
    .reduce((a, b) => a.concat(b), []);
};

export const calcMutualAspectMatches = (
  c1: Chart,
  c2: Chart,
  grahaKeys1: string[] = [],
  grahaKeys2: string[] = [],
  orbMap = null,
  aspectDegs: number[] = [0, 90, 120, 180],
  ascAspectDegs = [0, 30, 60, 90, 120, 150, 180],
): SynastryAspectMatch[] => {
  const matches = calcAspectMatches(
    c1,
    c2,
    grahaKeys1,
    grahaKeys2,
    orbMap,
    aspectDegs,
    ascAspectDegs,
  );
  const matches2 = calcAspectMatches(
    c2,
    c1,
    grahaKeys2,
    grahaKeys1,
    orbMap,
    aspectDegs,
    ascAspectDegs,
  );
  const isSamePair = (r1: SynastryAspectMatch, r2: SynastryAspectMatch) => {
    /* return (
      (r1.k1 === r2.k1 && r1.k2 === r2.k2) ||
      (r1.k1 === r2.k2 && r1.k2 === r2.k1)
    ); */
    return r1.k1 === r2.k2 && r1.k2 === r2.k1;
  };
  for (const r2 of matches2) {
    const hasRow = matches.some(
      r1 => isSamePair(r1, r2) && r1.distance === r2.distance,
    );

    if (!hasRow) {
      matches.push(r2);
      console.log(hasRow, r2);
    }
  }
  matches.sort((a, b) => a.distance - b.distance);
  return matches;
};

const matchCaughadia = ({ jd, weekDay, dayStart, dayLength, isDaytime }) => {
  const caughadiaDayRow = caughadiaData.days.find(row => row.day === weekDay);
  const caughadiaStart = isDaytime
    ? caughadiaDayRow.dayStart
    : caughadiaDayRow.nightStart;
  const caughadiaEighths = Array.from(
    { length: 8 },
    (x, i) => ((caughadiaStart - 1 + i) % 7) + 1,
  );
  const eighthJd = dayLength / 8;
  return caughadiaEighths.map((num, ri) => {
    const cRow = caughadiaData.values.find(row => row.num === num);
    const startJd = dayStart + ri * eighthJd;
    const active = jd >= startJd && jd < startJd + eighthJd;
    return { ...cRow, startJd, startDt: jdToDateTime(startJd), active };
  });
};

export const calcJdPeriodRange = (num, startJd, periodLength) => {
  const start = startJd + (num - 1) * periodLength;
  const end = startJd + num * periodLength;
  return {
    start,
    end,
    startDt: jdToDateTime(start),
    endDt: jdToDateTime(end),
  };
};

const matchKalam = ({ jd, weekDay, dayBefore, sunData }) => {
  const kalamDayRow = kalamData.values.find(row => row.day === weekDay);
  const dayTimeStart = dayBefore ? sunData.prevRise.jd : sunData.rise.jd;
  const dayTimeLength = dayBefore
    ? sunData.prevSet.jd - dayTimeStart
    : sunData.set.jd - dayTimeStart;
  const eighthJd = dayTimeLength / 8;
  const ranges = Object.entries(kalamData.dict).map(entry => {
    const [key, name] = entry;
    const range = calcJdPeriodRange(kalamDayRow[key], dayTimeStart, eighthJd);
    const active = jd >= range.start && jd < range.end;
    const num = kalamDayRow[key];
    return { key, name, num, ...range, active };
  });
  return {
    dayTimeStart,
    dayTimeStartDt: jdToDateTime(dayTimeStart),
    day: kalamDayRow.day,
    ranges,
  };
};

/*
Calculate panchanga
*/
export const calcPanchanga = async (datetime, geo) => {
  if (!geo.alt) {
    geo.alt = ephemerisDefaults.altitude;
  }
  swisseph.swe_set_topo(geo.lng, geo.lat, geo.alt);
  const grahaSet = await calcGrahaSet(datetime);

  const sun = grahaSet.sun();

  const moon = grahaSet.moon();

  const sunMoonAngle = relativeAngle(sun.lng, moon.lng);

  const tithiVal = sunMoonAngle / (360 / 30);
  const tithiPercent = (tithiVal % 1) * 100;
  const tithiNum = Math.ceil(tithiVal);
  const tithiRow = tithiValues.find(t => t.num === tithiNum);
  const tithi = {
    ...tithiRow,
    percent: tithiPercent,
    remainder: 100 - tithiPercent,
  };

  const numYogas = yogaValues.length;
  const yogaDeg = 360 / numYogas;
  const yogaVal = (sun.longitude + moon.lng) / yogaDeg;
  const yogaIndex = Math.floor(yogaVal);
  let yogaRow = {};
  if (yogaIndex < numYogas) {
    yogaRow = yogaValues[yogaIndex];
  }
  const yogaPercent = (yogaVal % 1) * 100;
  const yoga = {
    ...yogaRow,
    index: yogaIndex,
    percent: yogaPercent,
    remainder: 100 - yogaPercent,
  };

  const karanaVal = sunMoonAngle / (360 / 60);
  const karanaPercent = (karanaVal % 1) * 100;
  const karanaNum = Math.ceil(karanaVal);
  const karanaRow = karanaData.karanas.find(r =>
    r.locations.includes(karanaNum),
  );

  const karana = {
    num: karanaNum,
    ...karanaRow,
    percent: karanaPercent,
  };

  const {
    jd,
    sunData,
    dayLength,
    dayBefore,
    isDaytime,
    weekDay,
  } = await calcJyotishSunRise(datetime, geo);
  const { rise, nextRise } = sunData;
  const sameDay = !dayBefore;
  const dayStart = sameDay ? rise.jd : nextRise.jd;
  const dayProgress = ((jd - dayStart) / dayLength) * 100;
  const varaRow = varaValues[weekDay];

  const vara = {
    ...varaRow,
    sunRise: sunData.rise.dt,
    dayLength,
    percent: dayProgress,
  };

  const hora = await calcHoras(datetime, geo);
  const caughadia = matchCaughadia({
    jd,
    weekDay,
    dayStart,
    dayLength,
    isDaytime,
  });
  const muhurta = await calcMuhurta(datetime, geo);
  const muhurtaRange = await calcDayMuhurtas(datetime, geo);
  const kalam = matchKalam({ jd, weekDay, dayBefore, sunData });

  const dms = {
    sunMoonAngle: degAsDms(sunMoonAngle),
    sun: degAsDms(sun.longitude),
    moon: degAsDms(moon.longitude),
  };

  return {
    ...grahaSet,
    sunMoonAngle,
    tithi,
    dms,
    yoga,
    karana,
    vara,
    hora,
    caughadia,
    muhurta,
    muhurtaRange,
    kalam,
  };
};

export const fetchAllSettings = (filters: Array<string> = []) => {
  const settings: any = {
    starValues,
    asteroidValues,
    grahaValues,
    nakshatraValues,
    aprakasaValues,
    upagrahaData,
    tithiValues,
    yogaValues,
    karanaData,
    varaValues,
    horaValues,
    ghatiValues,
    caughadiaData,
    muhurtaValues,
    kalamData,
    mrityubhagaData,
    rashiValues,
    arudhaValues,
    sphutaValues,
    induValues,
  };

  if (filters.length > 0) {
    if (filters.length > 1) {
      const mp = new Map<string, any>();
      filters.forEach(fk => {
        mp.set(fk, settings[fk]);
      });
      const obj = hashMapToObject(mp);
      return { valid: true, ...obj };
    } else if (filters.length === 1) {
      const filter = filters.shift();
      return { valid: true, [filter]: settings[filter] };
    } else {
      return { valid: false };
    }
  } else {
    return { valid: true, ...settings };
  }
};

export const getSunMoonSpecialValues = (
  jd = 0,
  iTime: ITime,
  sunLng = 0,
  moonLng = 0,
) => {
  const nakIndex = Math.floor(moonLng / (360 / 27)) % 27;
  const nakshatra = nakshatraValues[nakIndex];
  const data = {
    karana: calcKarana(sunLng, moonLng),
    tithi: calcTithi(sunLng, moonLng),
    yoga: calcYoga(sunLng, moonLng),
    vara: calcVara(jd, iTime),
    nakshatra,
  };
  const rulers = Object.fromEntries(
    Object.entries(data)
      .filter(entry => entry[1] instanceof Object)
      .map(entry => [entry[0], entry[1].ruler]),
  );
  return { rulers, ...data };
};

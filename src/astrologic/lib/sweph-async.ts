import * as util from 'util';
import * as swisseph from 'swisseph';
import { smartCastFloat } from '../../lib/converters';

/* export const calcAsync = util.promisify(swisseph.calc); */

export const calcUtAsync = util.promisify(swisseph.swe_calc_ut);

export const riseTransAsync = util.promisify(swisseph.swe_rise_trans);

export const fixedStarAsync = util.promisify(swisseph.swe_fixstar);

export const fixedStarUtAsync = util.promisify(swisseph.swe_fixstar_ut);

export const fixedStar2UtAsync = util.promisify(swisseph.swe_fixstar2_ut);

export const fixstar2MagAsync = util.promisify(swisseph.swe_fixstar2_mag);

export const getHouses = util.promisify(swisseph.swe_houses_ex);

export const getColTrans = util.promisify(swisseph.swe_cotrans);

export const getAzalt = util.promisify(swisseph.swe_azalt);

export const getAyanamsa = (jd = 0, flag = 0) => {
  const result = swisseph.swe_get_ayanamsa_ex_ut(jd, flag);
  let ayanamsa = 0;
  let error: any = null;
  if (result instanceof Object) {
    Object.entries(result).forEach(([k, v]) => {
      switch (k) {
        case 'error':
          error = v;
          break;
        case 'ayanamsa':
          ayanamsa = smartCastFloat(v);
          break;
      }
    });
  }
  return { ayanamsa, error };
};

export const getSidTime = (jd = 0, eps = 0, nut = 0) => {
  const result = swisseph.swe_sidtime0(jd, eps, nut);
  return result instanceof Object ? result.siderialTime * 3600 : -1;
};

export const getDeltaT = (jd = 0): number => {
  const result = swisseph.swe_deltat(jd);
  return result instanceof Object ? result.delta : -1;
};

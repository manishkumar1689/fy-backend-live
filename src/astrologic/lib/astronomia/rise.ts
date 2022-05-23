/* eslint key-spacing: 1 */
/**
 * @copyright 2013 Sonia Keys
 * @copyright 2016 commenthol
 * @license MIT
 * @module rise
 */
/**
 * Rise: Chapter 15, Rising, Transit, and Setting.
 */

import base from './base'
import { TransitJdSet } from '../interfaces'
const { acos, asin, cos, sin } = Math

/**
 * @typedef {object} RiseObj
 * @property {number} rise - in seconds
 * @property {number} transit - in seconds
 * @property {number} set - in seconds
 */

const SECS_PER_DEGREE = 240 // = 86400 / 360
const SECS_PER_DAY = 86400
const D2R = Math.PI / 180

export const errorAboveHorizon = base.errorCode('always above horizon', -1)
export const errorBelowHorizon = base.errorCode('always below horizon', 1)

/**
 * @return {number} local angle in radians
 */
export function hourAngle (lat, h0, δ, throwException = false) {
  // approximate local hour angle
  const cosH = (sin(h0) - sin(lat) * sin(δ)) / (cos(lat) * cos(δ)) // (15.1) p. 102
  if (throwException) {
    if (cosH < -1) {
      throw errorAboveHorizon
    } else if (cosH > 1) {
      throw errorBelowHorizon
    }
  }
  const H = acos(cosH)
  return H
}

/**
 * @param {number} lon - longitude in radians
 * @param {number} α - right ascension in radians
 * @param {number} th0 - sidereal.apparent0UT in seconds of day `[0...86400[`
 * @return {number} time of transit in seconds of day `[0, 86400[`
 */
function _mt (lon, α, th0) {
  // const mt = (((lon + α) * 180 / Math.PI - (th0 * 360 / 86400)) * 86400 / 360)
  const mt = (lon + α) * SECS_PER_DEGREE * 180 / Math.PI - th0
  return mt
}

/**
 * @param {number} Th0 - sidereal.apparent0UT in seconds of day `[0...86400[`
 * @param {number} m - motion in seconds of day `[0...86400[`
 * @return {number} new siderial time seconds of day `[0...86400[`
 */
function _th0 (Th0, m) {
  // in original formula Th0 = 0...360 and m = 0...1 -> return value would be in 0...360 degrees
  // Th0 /= 240
  // m /= 86400
  const th0 = base.pmod(Th0 + m * 360.985647 / 360, SECS_PER_DAY) // p103
  return th0 // 0...86400 in seconds angle
}

/**
 * ApproxTimes computes approximate UT rise, transit and set times for
 * a celestial object on a day of interest.
 *
 * The function argurments do not actually include the day, but do include
 * values computed from the day.
 *
 * @param {GlobeCoord} p - is geographic coordinates of observer.
 * @param {number} h0 - is "standard altitude" of the body in radians
 * @param {number} Th0 - is apparent sidereal time at 0h UT at Greenwich in seconds
 *        (range 0...86400) must be the time on the day of interest, in seconds.
 *        See sidereal.apparent0UT
 * @param {number} α - right ascension (radians)
 * @param {number} δ - declination (radians)
 * @return {RiseObj} Result units are seconds and are in the range [0,86400)
 * @throws Error
 */
export function approxTimes(p, h0 = 0, Th0 = 0, α = 0, δ = 0, Th1 = -1): TransitJdSet {
  const H0 = hourAngle(p.lat, h0, δ) * SECS_PER_DEGREE * 180 / Math.PI // in degrees per day === seconds
  // approximate transit, rise, set times.
  // (15.2) p. 102.0
  const mt = _mt(p.lon, α, Th0)
  const mtTh0 = Th1 >= 0 ? Th1 : (Th0 - (SECS_PER_DAY / 2) + SECS_PER_DAY) % SECS_PER_DAY;
  const mt2 = _mt(p.lon, α, mtTh0);
  return {
    mc: base.pmod(mt, SECS_PER_DAY),
    rise: base.pmod(mt - H0, SECS_PER_DAY),
    set: base.pmod(mt + H0, SECS_PER_DAY),
    ic: base.pmod(mt2, SECS_PER_DAY),
  }
}


export default {
  errorAboveHorizon,
  errorBelowHorizon,
  hourAngle,
  approxTimes,
}

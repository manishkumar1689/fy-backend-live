/**
 * @copyright 2013 Sonia Keys
 * @copyright 2016 commenthol
 * @license MIT
 * @module sexagesimal
 */
/**
 * Sexagesimal functions
 */


/**
 * DMSToDeg converts from parsed sexagesimal angle components to decimal
 * degrees.
 * @param {Boolean} neg - sign, true if negative
 * @param {Number} d - (int) degree
 * @param {Number} m - (int) minute
 * @param {Number} s - (float) second
 * @returns {Number} angle in degree
 */
 export function DMSToDeg (neg, d, m, s) {
  s = (((d * 60 + m) * 60) + s) / 3600
  if (neg) {
    return -s
  }
  return s
}

/**
 * separate fix `i` from fraction `f`
 * @private
 * @param {Number} float
 * @returns {Array} [i, f]
 *  {Number} i - (int) fix value
 *  {Number} f - (float) fractional portion; always > 1
 */
 function modf (float: number): number[] {
  const i = Math.trunc(float)
  const f = Math.abs(float - i)
  return [i, f]
}

/**
 * Rounds `float` value by precision
 * @private
 * @param {Number} float - value to round
 * @param {Number} [precision] - (int) number of post decimal positions
 * @return {Number} rounded `float`
 */
function round (float, precision = 10) {
  return parseFloat(float.toFixed(precision))
}


/**
 * DegToDMS converts from decimal degrees to parsed sexagesimal angle component.
 * @param {Number} deg - angle in degree
 * @returns {Array} [neg, d, m, s]
 *  {Boolean} neg - sign, true if negative
 *  {Number} d - (int) degree
 *  {Number} m - (int) minute
 *  {Number} s - (float) second
 */
 export function degToDMS (deg = 0) {
  const neg = (deg < 0)
  deg = Math.abs(deg)
  const [d, s] = modf(deg % 360)
  const [m, s1] = modf(s * 60)
  const s2 = round(s1 * 60) // may introduce an error < 1e13
  return [neg, d, m, s2]
}

/**
 * Angle represents a general purpose angle.
 * Unit is radians.
 */
export class Angle {

  angle = 0;
  /**
  * constructs a new Angle value from sign, degree, minute, and second
  * components.
  * @param {Number|Boolean} angleOrNeg - angle in radians or sign, true if negative (required to attribute -0°30')
  * __Four arguments__
  * @param {Number} [d] - (int) degree
  * @param {Number} [m] - (int) minute
  * @param {Number} [s] - (float) second
  */
  constructor (angleOrNeg, d, m, s) {
    if (arguments.length === 1) {
      this.angle = Number(angleOrNeg)
    } else {
      this.setDMS(!!angleOrNeg, d, m, s)
    }
  }

  /**
   * SetDMS sets the value of an FAngle from sign, degree, minute, and second
   * components.
   * The receiver is returned as a convenience.
   * @param {Boolean} neg - sign, true if negative
   * @param {Number} d - (int) degree
   * @param {Number} m - (int) minute
   * @param {Number} s - (float) second
   * @returns {Angle}
   */
  setDMS (neg = false, d = 0, m = 0, s = 0.0) {
    this.angle = (DMSToDeg(neg, d, m, s) * Math.PI / 180)
    return this
  }

  /**
   * sets angle
   * @param {Number} angle - (float) angle in radians
   * @returns {Angle}
   */
  setAngle (angle) {
    this.angle = angle
    return this
  }

  /**
   * Rad returns the angle in radians.
   * @returns {Number} angle in radians
   */
  rad () {
    return this.angle
  }

  /**
   * Deg returns the angle in degrees.
   * @returns {Number} angle in degree
   */
  deg () {
    return this.angle * 180 / Math.PI
  }

  /**
   * toDMS converts to parsed sexagesimal angle component.
   */
  toDMS () {
    return degToDMS(this.deg())
  }

  /**
   * Print angle in degree using `d°m´s.ss″`
   * @param {Number} [precision] - precision of `s.ss`
   * @returns {String}
   */
  toString (precision = 0) {
    const [neg, d, m, s] = this.toDMS()
    const s2 = round(s, precision).toString().replace(/^0\./, '.')
    const str = (neg ? '-' : '') +
      (d + '°') +
      (m + '′') +
      (s2 + '″')
    return str
  }

  /**
   * Print angle in degree using `d°.ff`
   * @param {Number} [precision] - precision of `.ff`
   * @returns {String}
   */
  toDegString (precision = 0) {
    const [i, s] = modf(this.deg())
    const s2 = round(s, precision).toString().replace(/^0\./, '.')
    const str = (i + '°') + s2;
    return str
  }
}

/**
 * HourAngle represents an angle corresponding to angular rotation of
 * the Earth in a specified time.
 *
 * Unit is radians.
 */
export class HourAngle extends Angle {
  /**
   * NewHourAngle constructs a new HourAngle value from sign, hour, minute,
   * and second components.
   * @param {Boolean} neg
   * @param {Number} h - (int)
   * @param {Number} m - (int)
   * @param {Number} s - (float)
   * @constructor
   */

  /**
   * SetDMS sets the value of an FAngle from sign, degree, minute, and second
   * components.
   * The receiver is returned as a convenience.
   * @param {Boolean} neg - sign, true if negative
   * @param {Number} h - (int) hour
   * @param {Number} m - (int) minute
   * @param {Number} s - (float) second
   * @returns {Angle}
   */
  setDMS (neg = false, h = 0, m = 0, s = 0.0) {
    this.angle = (DMSToDeg(neg, h, m, s) * 15 * Math.PI / 180)
    return this
  }

  /**
   * Hour returns the hour angle as hours of time.
   * @returns hour angle
   */
  hour () {
    return this.angle * 12 / Math.PI // 12 = 180 / 15
  }

  deg () {
    return this.hour()
  }

  /**
   * Print angle in `HʰMᵐs.ssˢ`
   * @param {Number} precision - precision of `s.ss`
   * @returns {String}
   */
  toString (precision = 0) {
    const [neg, h, m, s] = this.toDMS()
    const s2 = round(s, precision).toString().replace(/^0\./, '.')
    const str = (neg ? '-' : '') +
      (h + 'ʰ') +
      (m + 'ᵐ') +
      (s2 + 'ˢ')
    return str
  }
}

export class RA extends HourAngle {


  angle = 0;

  /**
   * constructs a new RA value from hour, minute, and second components.
   * Negative values are not supported, RA wraps values larger than 24
   * to the range [0,24) hours.
   * @param {Number} h - (int) hour
   * @param {Number} m - (int) minute
   * @param {Number} s - (float) second
   */
  constructor (h = 0, m = 0, s = 0) {
    super(false, h, m, s)
    //const args = [].slice.call(arguments)
    const args = [].slice.call(h, m, s)
    if (args.length === 1) {
      this.angle = h
    } else {
      const hr = DMSToDeg(false, h, m, s) % 24
      this.angle = hr * 15 * Math.PI / 180
    }
  }

  hour () {
    const h = this.angle * 12 / Math.PI
    return (24 + (h % 24)) % 24
  }
}

/**
 * Time Angle
 * Unit is time in seconds.
 */
export class Time {

  time = 0;
  /**
   * @param {boolean|number} negOrTimeInSecs - set `true` if negative; if type is number than time in seconds
   * @param {number} [h] - (int) hour
   * @param {number} [m] - (int) minute
   * @param {number} [s] - (float) second
   * @example
   * new sexa.Time(SECS_OF_DAY)
   * new sexa.Time(false, 15, 22, 7)
   */
  constructor (negOrTimeInSecs = 0, h = 0, m = 0, s = 0) {
    if (typeof negOrTimeInSecs === 'number') {
      this.time = negOrTimeInSecs
    } else {
      this.setHMS(negOrTimeInSecs, h, m, s)
    }
  }

  setHMS (neg = false, h = 0, m = 0, s = 0) {
    s += ((h * 60 + m) * 60)
    if (neg) {
      s = -s
    }
    this.time = s
  }

  /**
   * @returns {Number} time in seconds.
   */
  sec () {
    return this.time
  }

  /**
   * @returns {Number} time in minutes.
   */
  min () {
    return this.time / 60
  }

  /**
   * @returns {Number} time in hours.
   */
  hour () {
    return this.time / 3600
  }

  /**
   * @returns {Number} time in days.
   */
  day () {
    return this.time / 3600 / 24
  }

  /**
   * @returns {Number} time in radians, where 1 day = 2 Pi radians.
   */
  rad () {
    return this.time * Math.PI / 12 / 3600
  }

  /**
   * convert time to HMS
   * @returns {Array} [neg, h, m, s]
   *  {Boolean} neg - sign, true if negative
   *  {Number} h - (int) hour
   *  {Number} m - (int) minute
   *  {Number} s - (float) second
   */
  toHMS () {
    let t = this.time
    const neg = (t < 0)
    t = (neg ? -t : t)
    const h = Math.trunc(t / 3600)
    t = t - (h * 3600)
    const m = Math.trunc(t / 60)
    const s = t - (m * 60)
    return [neg, h, m, s]
  }

  /**
   * Print time using `HʰMᵐsˢ.ss`
   * @param {Number} precision - precision of `.ss`
   * @returns {String}
   */
  toString (precision = 0) {
    const [neg, h, m, s] = this.toHMS()
    const s2 = typeof s === 'number' ? s : 0;
    let [si, sf] = modf(s2)
    if (precision === 0) {
      si = round(s, 0)
      sf = 0
    } else {
      sf = parseFloat(round(sf, precision).toString().substr(1))
    }
    const str = (neg ? '-' : '') +
      (h + 'ʰ') +
      (m + 'ᵐ') +
      (si + 'ˢ') +
      (sf || '')
    return str
  }
}

// units
export const angleFromDeg = (deg = 0) => deg * Math.PI / 180
export const angleFromMin = (min = 0) => min / 60 * Math.PI / 180
export const angleFromSec = (sec = 0) => sec / 3600 * Math.PI / 180
export const degFromAngle = (angle = 0) => angle * 180 / Math.PI
export const secFromAngle = (angle = 0) => angle * 3600 * 180 / Math.PI
export const secFromHourAngle = (ha = 0) => ha * 240 * 180 / Math.PI

export default {
  Angle,
  HourAngle,
  DMSToDeg,
  degToDMS,
  RA,
  Time,
  angleFromDeg,
  angleFromMin,
  angleFromSec,
  degFromAngle,
  secFromAngle,
  secFromHourAngle
}

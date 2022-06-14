import * as swisseph from 'swisseph';
import * as moment from 'moment-timezone';
import { isNumeric, isInteger, validISODateString } from '../../lib/validators';
import { Moment } from 'moment';
import { zeroPad } from '../../lib/converters';
import { GeoLoc } from './models/geo-loc';

export const defaultDateParts = { year: 0, month: 0, day: 0, hour: 0 };

export const zero2Pad = num => {
  let out = '';
  if (isNumeric(num)) {
    const iVal = parseInt(num);
    if (iVal < 10) {
      out = '0' + iVal;
    } else {
      out = iVal.toString();
    }
  }
  return out;
};

export const buildIsoDateFromParts = dp => {
  const hours = Math.floor(dp.hour);
  const minVal = (dp.hour % 1) * 60;
  const mins = Math.floor(minVal);
  const secs = Math.ceil((minVal % 1) * 60);
  const strDate = [dp.year, zero2Pad(dp.month - 1), zero2Pad(dp.day)].join('-');
  const strTime = [zero2Pad(hours), zero2Pad(mins), zero2Pad(secs)].join(':');
  const isoDate = [strDate, strTime].join('T');
  return moment
    .utc(isoDate)
    .format()
    .split('.')
    .shift();
};

export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export const toDateParts = (strDate: string): DateParts => {
  const [dtPart, remainder] = strDate
    .trim()
    .replace(' ', 'T')
    .split('T');
  const timeStr = remainder.split('.').shift();
  const isNeg = dtPart.startsWith('-');
  const dtStr = isNeg ? dtPart.substring(1) : dtPart;
  const [years, months, days] = dtStr
    .split('-')
    .map(part => parseInt(part, 10));
  const [hours, minutes, secs] = timeStr
    .split(':')
    .map(part => parseInt(part, 10));
  const seconds = typeof secs === 'number' ? secs : 0;
  const minSecs = minutes * 60 + seconds;
  const decHrs = hours + minSecs / 3600;
  const negMultiplier = isNeg ? -1 : 1;
  return {
    year: years * negMultiplier,
    month: months,
    day: days,
    hour: decHrs,
  };
};

export const calcJulDateFromParts = (dp: DateParts) => {
  //const gregFlag = julian === true ? swisseph.SE_JUL_CAL : swisseph.SE_GREG_CAL;
  return swisseph.swe_julday(
    dp.year,
    dp.month,
    dp.day,
    dp.hour,
    swisseph.SE_GREG_CAL,
  );
};

export const calcJulDate = (strDate: string) => {
  const dp = toDateParts(strDate);
  return calcJulDateFromParts(dp);
};

export const buildDatePartsFromParams = query => {
  const keys = Object.keys(query);
  const dp = defaultDateParts;
  if (keys.includes('y')) {
    if (isNumeric(query.y)) {
      dp.year = parseInt(query.y, 10);
    }
    if (keys.includes('m') && isNumeric(query.m)) {
      dp.month = parseInt(query.m, 10);
    }
    if (keys.includes('d') && isNumeric(query.d)) {
      dp.day = parseInt(query.d, 10);
    }
    if (keys.includes('h') && isNumeric(query.h)) {
      dp.hour = parseFloat(query.h);
    } else if (keys.includes('hrs') && isInteger(query.hrs)) {
      let h = parseInt(query.hrs);
      if (keys.includes('min') && isNumeric(query.min)) {
        h += parseInt(query.min) / 60;
        if (keys.includes('sec') && isNumeric(query.sec)) {
          h += parseFloat(query.sec) / 3600;
        }
      }
      dp.hour = h;
    }
  }
  return dp;
};

/*
@param params:Object
*/
export const calcJulianDate = params => {
  let iso = null;
  let jd = null;
  let dp = defaultDateParts;
  if (params instanceof Object) {
    if (params.hasOwnProperty('dt') && validISODateString(params.dt)) {
      iso = params.dt;
    } else if (params.hasOwnProperty('y')) {
      dp = buildDatePartsFromParams(params);
    }
  }
  if (iso) {
    jd = calcJulDate(iso);
  } else if (dp.year > 0) {
    jd = calcJulDateFromParts(dp);
    iso = buildIsoDateFromParts(dp);
  }
  return {
    iso,
    jd,
  };
};

export const julToUnixTime = (jd: number, tzOffset = 0): number => {
  const epoch = 2440587.5; // Jan. 1, 1970 00:00:00 UTC
  return jd !== undefined ? (jd - epoch) * 86400 + tzOffset : 0;
};

export const julToISODateObj = (jd: number, tzOffset = 0): Moment => {
  return !isNaN(jd) ? moment.unix(julToUnixTime(jd, tzOffset)) : moment.unix(0);
};

export const julToISODate = (jd: number, tzOffset = 0): string => {
  return julToISODateObj(jd, tzOffset).toISOString();
};

export const currentISODate = (fromDayStart = false) => {
  const dt = moment.utc().format();
  return fromDayStart ? dt.split('T').shift() + 'T00:00:00' : dt;
};

export const matchJdAndDatetime = (
  dtRef = '',
  startJd = -1,
  fromDayStart = false,
  fromNoon = false,
) => {
  const strRef =
    typeof dtRef === 'string' ? dtRef.trim().replace(/\s+/, 'T') : dtRef;
  const isValidDate = validISODateString(strRef);
  const flVal = !isValidDate && isNumeric(strRef) ? parseFloat(strRef) : -1;
  const hasFl = flVal > 0;
  const refFl = startJd <= 0 || flVal > startJd ? flVal : startJd + flVal;

  const dtUtcRaw = isValidDate
    ? strRef
    : hasFl
    ? julToISODate(refFl)
    : currentISODate(fromDayStart);
  const startHourDigits = fromNoon ? '12' : '00';
  const dtUtc = fromDayStart
    ? dtUtcRaw.split('T').shift() + `T${startHourDigits}:00:00`
    : dtUtcRaw;
  const jd = hasFl ? refFl : calcJulDate(dtUtc);
  return { dtUtc, jd };
};

export const matchLocaleJulianDayData = (dtRef = null, geo: GeoLoc) => {
  const { jd, dtUtc } = matchJdAndDatetime(dtRef);
    const hoursOffset = geo.lng / 15;
    const utcFrac = jd % 1;
    const jdOffset = hoursOffset / 24;
    const jdNoonFrac = (1 - jdOffset) % 1;
    const utcHours = (utcFrac * 24 + 12) % 24;
    const geoHours = ((utcFrac + jdOffset) * 24 + 12) % 24;
    const isAm = geoHours < 12;
    const jdInt = parseInt(jd, 10);
    const baseJd = isAm ? jdInt : jdInt - 1;
    const noonJd = baseJd + jdNoonFrac;
    return { jd, dtUtc, geo, hoursOffset, jdNoonFrac, geoHours, utcHours, isAm, noonJd };
}

export const matchEndJdAndDatetime = (strRef = '', startJd = 0) => {
  const { jd, dtUtc } = matchJdAndDatetime(strRef, startJd);
  return { endJd: jd, endDt: dtUtc.split('.').shift() };
};

export const jdToDateParts = (jd: number) => {
  return swisseph.swe_revjul(jd, swisseph.SE_GREG_CAL);
};

export const convertUnitValsToDays = (numVal: number, unit = ''): number => {
  switch (unit) {
    case 'y':
    case 'year':
    case 'yr':
    case 'yrs':
    case 'years':
      return numVal * 366;
    case 'm':
    case 'mon':
    case 'mons':
    case 'mns':
    case 'month':
    case 'months':
      return numVal * 31;
    case 'w':
    case 'week':
    case 'weeks':
    case 'wk':
    case 'wks':
      return numVal * 7;
    default:
      return numVal;
  }
};

export const durationStringToDays = (str = ''): number => {
  const m = typeof str === 'string' ? str.trim().match(/^(\d+)([a-z]+)$/i) : [];
  let days = 0;
  if (m instanceof Array && m.length > 2) {
    const numVal = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    days = convertUnitValsToDays(numVal, unit);
  }
  return days;
};

export const jdToDateTime = (jd: number): string => {
  const parts = jdToDateParts(jd);
  const dateStr = [parts.year, zero2Pad(parts.month), zero2Pad(parts.day)].join(
    '-',
  );
  const hours = Math.floor(parts.hour);
  const mfl = (parts.hour % 1) * 60;
  const minutes = Math.floor(mfl);
  const sfl = (mfl % 1) * 60;
  const seconds = Math.floor(sfl);
  const millisecs = (sfl % 1)
    .toFixed(3)
    .split('.')
    .pop();
  const timeStr = [zero2Pad(hours), zero2Pad(minutes), zero2Pad(seconds)].join(
    ':',
  );
  return dateStr + 'T' + timeStr + '.' + millisecs;
};

export const calcAstroWeekDayIndex = (datetime, afterSunrise = true) => {
  const daySubtract = afterSunrise ? 0 : 1;
  return moment(datetime)
    .subtract(daySubtract, 'day')
    .weekday();
};

export const weekDayNum = (dt: Date | string, dayBefore = false): number => {
  const isoNum = moment(dt).isoWeekday();
  const dayNum = isoNum < 7 && isoNum > 0 ? isoNum - 1 : isoNum % 7;
  const offset = dayBefore ? -1 : 0;
  return (dayNum + 7 + offset) % 7;
};

export const toDateTime = (dt: Date | string): Date => {
  return moment.utc(dt);
};

export const hourMinTz = (offset = 0) => {
  const secs = Math.abs(offset);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor(secs / 60) % 60;
  const parts = [offset >= 0 ? '+' : '-', zeroPad(hours, 2)];
  if (minutes > 0) {
    parts.push(':');
    parts.push(zeroPad(minutes, 2));
  }
  return parts.join('');
};

export const shortTzAbbr = (
  dt: string | Date,
  timeZone: string,
  offset = -1,
) => {
  const mt = moment(dt).add({ seconds: offset });
  let abbr = moment.tz(mt.toISOString(), timeZone).zoneAbbr();
  if (abbr) {
    switch (abbr) {
      case '+00':
        abbr = 'GMT';
        break;
    }
  } else if (offset !== -1) {
    abbr = hourMinTz(offset);
  }
  return abbr;
};

export const applyTzOffsetToDateString = (dt, offsetSecs: number) => {
  return moment
    .utc(dt)
    .subtract(offsetSecs, 'seconds')
    .toISOString()
    .split('.')
    .shift();
};

export const yearsAgoString = (years = 1): string => {
  const dt = new Date();
  const yr = dt.getFullYear();
  const wholeYears = Math.floor(years);
  const remainder = years % 1;
  const months = Math.floor(remainder * 12);
  let newYear = yr - wholeYears;
  if (months > 0) {
    const m = dt.getMonth();
    const subM = m - months;
    const newM = (subM + 12) % 12;
    dt.setMonth(newM);
    if (subM < 0) {
      newYear--;
    }
  }
  dt.setFullYear(newYear);
  return dt
    .toISOString()
    .split('.')
    .shift();
};

export const minutesAgoTs = (repeatIntervalMins: number) => {
  const nowTs = new Date().getTime();
  const msAgo = repeatIntervalMins * 60 * 1000;
  return nowTs - msAgo;
};

export const utcDate = (dt: Date | string) => {
  return moment.utc(dt);
};

export const dateAgo = (numAgo = 31, unit = 'days') => {
  const days = convertUnitValsToDays(numAgo, unit);
  return moment().subtract({ days });
};

export const dateAgoString = (numAgo = 31, unit = 'days') => {
  return dateAgo(numAgo, unit)
    .toISOString()
    .split('.')
    .shift();
};

export const toShortTzAbbr = (dt, timezoneRef: string) =>
  moment.tz(dt, timezoneRef).format('z');

export const julToDateFormat = (
  jd: number,
  tzOffset = 0,
  fmt = 'euro1',
  timeOptions = {
    time: true,
    seconds: true,
  },
): string => {
  const dtS = julToISODate(jd, tzOffset);
  const [dt, tm] = dtS.split('T');
  const [y, m, d] = dt.split('-');

  let dp = [d, m, y];
  let sep = '/';
  switch (fmt) {
    case 'us':
      dp = [m, d, y];
      break;
    case 'euro2':
      sep = '.';
      break;
    case 'iso':
      dp = [y, m, d];
      break;
    case '-':
    case '':
      dp = [];
      break;
  }
  const parts = dp.length > 1 ? [dp.join(sep)] : [];
  if (timeOptions.time) {
    const timeParts = tm
      .split('.')
      .shift()
      .split(':');
    const tp = timeOptions.seconds ? timeParts : timeParts.slice(0, 2);
    parts.push(tp.join(':'));
  }
  return parts.join(' ');
};

export const decimalYear = (strDate = '') => {
  const mom = validISODateString(strDate) ? moment.utc(strDate) : moment.utc();
  const years = mom.year();
  const numDaysInYear = mom.isLeapYear() ? 366 : 365;
  const yearProgress = mom.dayOfYear() / numDaysInYear;
  return years + yearProgress;
};

export const julRangeToAge = (startJd: number, endJd: number, tzOffset = 0) => {
  const firstDate = julToISODateObj(startJd, tzOffset);
  const secondDate = julToISODateObj(endJd, tzOffset);
  const yearDiff = firstDate.diff(secondDate, 'year', true);
  return yearDiff;
};

export const dtStringToNearest15Minutes = (dtStr = '') => {
  if (validISODateString(dtStr)) {
    const parts = dtStr.split(/[T ]/);
    const timePart = parts[1].split('.').shift();
    const timeParts = timePart.split(':');
    const mins = Math.round(parseInt(timeParts[1], 10) / 15) * 15;
    return [parts[0], [timeParts[0], zero2Pad(mins), '00'].join('-')].join('T');
  } else {
    return dtStr;
  }
}

/*
  mainly for debugging
*/
export const unixTsToISODateString = (ts = 0, milliSecs = false) => {
  const multiple = milliSecs? 1 : 1000;
  return new Date(ts * multiple).toISOString().split('.').shift();
}
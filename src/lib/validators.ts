import { subtractLng360 } from "../astrologic/lib/math-funcs";

export const isString = str => typeof str === 'string' || str instanceof String;

export const notEmptyString = (str, min = 1) =>
  isString(str) && str.length >= min;

export const emptyString = (str, min = 1) => !notEmptyString(str, min);

export const objHasKeys = (obj: any, keys: Array<string>) => {
  let valid = false;
  if (obj instanceof Object) {
    const objKeys = Object.keys(obj);
    valid = keys.every(k => objKeys.indexOf(k) >= 0);
  }
  return valid;
};

export const objHasKey = (obj: any, key: string) => {
  return objHasKeys(obj, [key]);
};

const numPattern = `\s*-?\\d+(\\.\\d+)?`;

const intPattern = `\s*-?\\d+\s*$`;

const numRgx = new RegExp('^' + numPattern);

const intRgx = new RegExp('^' + intPattern);

export const isNumericType = inval =>
  typeof inval === 'number' || inval instanceof Number;

export const isNumber = inval => isNumericType(inval) && !isNaN(inval);

export const isNumeric = inval => isNumber(inval) || numRgx.test(inval);

export const isInteger = inval =>
  isNumber(inval) ? inval % 1 === 0 : intRgx.test(inval);

export const approximate = (inval: number, precision = 6) => {
  const multiplier = Math.pow(10, precision);
  return Math.floor(inval * multiplier) / multiplier;
};

export const isApprox = (iv1: number, iv2: number, precision: number) =>
  approximate(iv1, precision) === approximate(iv2, precision);

export const numericStringInRange = (numStr, min = -180, max = 180) => {
  const flVal = parseFloat(numStr);
  let valid = false;
  if (!isNaN(flVal)) {
    valid = flVal >= min && flVal <= max;
  }
  return valid;
};

export const inRange = (num, range: number[]) => {
  let valid = false;
  if (isNumeric(num) && range instanceof Array && range.length > 1) {
    num = parseFloat(num);
    valid = num >= range[0] && num <= range[1];
  }
  return valid;
};

export const inRange360 = (num, range: number[]) => {
  const [start, end] = range;
  if (start <= end) {
    return inRange(num, range);
  } else {
    return [[start, 360], [0, end]].some(rng => inRange(num, rng));
  }
};

export const withinRanges = (num: number, ranges: number[][]) => {
  return ranges.some(range => inRange(num, range));
}

export const inTolerance360 = (deg = 0, target = 0, tolerance = 1) => {
  const range = [subtractLng360(target, tolerance), (target + tolerance) % 360];
  const spanZero = deg + tolerance > 360 || deg - tolerance < 0;
  return spanZero? (deg >= range[0] || deg < range[1]) && (deg < range[1] || deg > range[0]) : deg >= range[0] && deg <= range[1];
};

export const withinTolerance = (
  num: number | string,
  target: number | string,
  tolerance: number | string,
) => {
  let valid = false;
  if (isNumeric(num) && isNumeric(target) && isNumeric(tolerance)) {
    num = typeof num === 'string' ? parseFloat(num) : num;
    target = typeof target === 'string' ? parseFloat(target) : target;
    tolerance =
      typeof tolerance === 'string' ? parseFloat(tolerance) : tolerance;
    valid = num >= target - tolerance && num <= target + tolerance;
  }
  return valid;
};

export const validLocationParameter = loc => {
  let valid = false;
  if (notEmptyString(loc, 3)) {
    const rgx = new RegExp(
      `^(${numPattern}),(${numPattern})(,(${numPattern}))?$`,
    );
    const match = loc.match(rgx);
    if (match) {
      if (match[1]) {
        valid = numericStringInRange(match[1], -90, 90);
      }
      if (valid) {
        if (match[3]) {
          valid = numericStringInRange(match[1], -179.9999999999999, 180);
        }
        if (match[6]) {
          valid = isNumeric(match[6]);
        }
      }
    }
  }
  return valid;
};

export const validISODateString = str => {
  return /^-?\d{1,4}-\d\d-\d\d((T|\s)\d\d:\d\d(:\d\d)?)?/.test(str);
};

export const validEmail = (email: string) => {
  const rgx = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  return email.length > 5 && rgx.test(email);
}

export const isSystemFileName = (str = null) => {
  return typeof str === 'string' && /^[0-9a-f]{20,32}-\d+(\.\w{3,6})$/i.test(str);
}

/**
 * Basic URI check for remote resource references, typically with schema + 
 */
export const validUri = (uri = null) => {
  const rgx = /^\w+:\/\/\w+[^ ]+$/i;
  return notEmptyString(uri, 5) && rgx.test(uri);
}

export const isLocationString = (loc = null) => {
  return typeof loc === 'string' && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?(,-?\d+)?/.test(loc.trim());
}
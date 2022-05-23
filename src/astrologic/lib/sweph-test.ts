import * as swisseph from 'swisseph';

export const getFuncNames = () => {
  let vals = [];
  if (swisseph instanceof Object) {
    for (const name in swisseph) {
      const func = swisseph[name];
      if (func instanceof Function) {
        vals.push(name);
      }
    }
  }
  return vals;
}

export const getConstantVals = () => {
  let vals = [];
  if (swisseph instanceof Object) {
    for (const name in swisseph) {
      const value = swisseph[name];
      if (typeof value === 'number') {
        vals.push({ name, value })
      }
    }
  }
  return vals;
}

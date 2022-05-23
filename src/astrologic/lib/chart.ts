import * as util from 'util';
import * as path from 'path';
const exec = require('child_process').exec;
import {
  notEmptyString,
  emptyString,
  validLocationParameter,
  validISODateString,
} from '../../lib/validators';
const run = util.promisify(exec);

export const chartData = async (dt = '', loc) => {
  const currDir = __dirname.replace('/dist/astrologic/', '/src/astrologic/');
  const scriptDir = path.resolve(currDir + '/../scripts') + '/';
  let datetime = '';
  let location = '';
  let result: any = { valid: false };
  if (dt && loc) {
    if (validISODateString(dt)) {
      datetime = dt;
    }
    if (validLocationParameter(loc)) {
      location = loc;
    }
  }
  if (datetime.length > 5 && location.length > 5) {
    const cmd = [`${scriptDir}astro`, datetime, location].join(' ');

    const out = await run(cmd);
    if (emptyString(out.stderr) && notEmptyString(out.stdout)) {
      result = JSON.parse(out.stdout);
    }
  } else {
    result = { valid: false, msg: 'Invalid datetime or location parameters' };
  }
  return result;
};

import { isNumeric } from './../../../lib/validators';

export class KaranaSet {
  num = 0;
  name = '';
  ruler = '';
  bm = '';
  type = '';
  deity = '';
  percent = 0;
  locations: Array<number> = [];

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'num':
          case 'percent':
            if (typeof v === 'number') {
              this[k] = v;
            }
            break;
          case 'name':
          case 'bm':
          case 'ruler':
          case 'type':
          case 'deity':
            if (typeof v === 'string') {
              this[k] = v;
            }
            break;
          case 'locations':
            if (v instanceof Array) {
              this.locations = v.filter(isNumeric).map(parseFloat);
            }
            break;
        }
      });
    }
  }
}

import nakshatraValues from '../settings/nakshatra-values';

export class Nakshatra {
  index = 0;
  num = 0;
  percent = 0;
  name = '';
  ruler = '';
  goal = '';
  sex = '';
  yoni = '';
  aksharas: Array<string> = [];
  nadi = '';

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'aksharas':
            if (v instanceof Array) {
              this.aksharas = v;
            }
            break;
          case 'index':
          case 'num':
          case 'percent':
            if (typeof v === 'number') {
              this[k] = v;
            }
            break;
            break;
          case 'ruler':
          case 'goal':
          case 'sex':
          case 'yoni':
          case 'nadi':
            if (typeof v === 'string') {
              this[k] = v;
            }
            break;
        }
      });
    }
  }
  get degrees() {
    return 360 / nakshatraValues.length;
  }

  get within() {
    return (this.percent / 100) * this.degrees;
  }
}

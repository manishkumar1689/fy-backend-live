import { toDateTime } from './../date-funcs';

export class BodyTransition {
  readonly jd: number = 0;
  readonly datetime?: Date = new Date();

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      const keys = Object.keys(inData);
      if (keys.includes('jd')) {
        this.jd = inData.jd;
      }
      if (keys.includes('datetime')) {
        this.datetime = toDateTime(inData.datetime);
      }
    }
  }
}

export class TransitionSet {
  num = 0;
  key = '';
  rise: BodyTransition = new BodyTransition();
  set: BodyTransition = new BodyTransition();
  mc: BodyTransition = new BodyTransition();
  ic: BodyTransition = new BodyTransition();

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'num':
            if (typeof v === 'number') {
              this.num = v;
            }
            break;
          case 'key':
            if (typeof v === 'string') {
              this.key = v;
            }
            break;
          case 'rise':
          case 'set':
          case 'mc':
          case 'ic':
            this[k] = new BodyTransition(v);
            break;
        }
      });
    }
  }
}

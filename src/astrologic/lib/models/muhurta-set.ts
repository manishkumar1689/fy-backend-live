export class MuhurtaBase {
  num = 0;
  name = '';
  quality = '';
  index = 0;
  exDays: Array<number> = [];
  jd = 0;

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'jd':
          case 'num':
          case 'index':
            if (typeof v === 'number') {
              this[k] = v;
            }
            break;
          case 'name':
          case 'quality':
            if (typeof v === 'string') {
              this[k] = v;
            }
            break;
          case 'exDays':
            if (v instanceof Array) {
              this[k] = v;
            }
            break;
        }
      });
    }
  }
}

export class MuhurtaItem extends MuhurtaBase {
  active = false;

  constructor(inData: any = null) {
    super(inData);
    if (inData instanceof Object) {
      const { active } = inData;
      if (typeof active === 'boolean') {
        this.active = active;
      }
    }
  }
}

export class MuhurtaSet extends MuhurtaBase {
  values: Array<MuhurtaItem> = [];

  constructor(inData: any = null) {
    super(inData);
    if (inData instanceof Object) {
      const { values } = inData;
      if (values instanceof Array) {
        this.values = values.map(item => new MuhurtaItem(item));
      }
    }
  }
}

export class HouseSet {
  jd = 0;
  houses: Array<number> = [];
  ascendant = 0;
  mc = 0;
  vertex = 0;
  ecliptic = 0;
  ascDeclination = 0;
  ascRectAscension = 0;
  mcRectAscension = 0;
  /* equatorialAscendant: number = 0;
  kochCoAscendant:number = 0;
  munkaseyCoAscendant:number = 0;
  munkaseyPolarAscendant:number = 0; */

  constructor(houseData: any = null, extraData = null) {
    if (houseData instanceof Object) {
      Object.entries(houseData).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'house':
          case 'houses':
            if (value instanceof Array) {
              this.houses = value;
            }
            break;
          case 'jd':
          case 'ascendant':
          case 'mc':
          case 'vertex':
            if (typeof value === 'number') {
              this[key] = value;
            }
            break;
        }
      });
    }
    if (extraData instanceof Object) {
      const posKeys = Object.keys(extraData);
      if (posKeys.includes("ecliptic") && posKeys.includes("ascDeclination")) {
        const { ecliptic, ascDeclination, ascRectAscension, mcRectAscension } = extraData
        this.ecliptic = ecliptic;
        this.ascDeclination = ascDeclination;
        this.ascRectAscension = ascRectAscension;
        this.mcRectAscension = mcRectAscension;
      }
    }
  }

  count = () => this.houses.length;

  rangeByNum(num: number) {
    if (num > 0 && num <= this.houses.length) {
      const index = num - 1;
      const nextIndex = num % this.houses.length;
      return [this.houses[index], this.houses[nextIndex]];
    } else {
      return [0, 0];
    }
  }

  start(num: number) {
    return this.rangeByNum(num)[0];
  }

  end(num: number) {
    return this.rangeByNum(num)[1];
  }
}

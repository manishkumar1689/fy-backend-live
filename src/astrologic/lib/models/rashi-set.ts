import rashiValues from '../settings/rashi-values';

export class Rashi {

  num:number = 1;
  key:string = "";
  ruler:string = "";
  en:string = "";
  icon:string = "";
  element:string = "";
  mobility:string = "";

  constructor(rashiRow:any = null) {
    if (rashiRow instanceof Object) {
      Object.entries(rashiRow).forEach(entry => {
        const [key, value] = entry;
        this[key] = value;
      })
    }
  }

  even = () => this.num % 2 === 0;

  startDegree = () => (this.num - 1) * 30;

  endDegree = () => (this.num * 30) % 360;

}

export class RashiSet {

  values = [];

  constructor() {
    this.values = rashiValues.map(rv => new Rashi(rv))
  }

  get(key) {
    const rashi = this.values.find(rv => rv.key === key);
    if (rashi) {
      return rashi;
    } else {
      return new Rashi();
    }
  }

  matchByDegree = (deg) => this.values.find(rv => deg >= ((rv.num - 1) * 30) && deg < (rv.num - 30));

}

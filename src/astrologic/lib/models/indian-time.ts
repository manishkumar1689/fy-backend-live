import * as moment from 'moment';
import { BaseObject } from './base-object';
import { JyotishDay } from './jyotish-day';
import { hashMapToObject } from '../../../lib/entities';
import { BodyTransition } from '../../interfaces/body-transition';
import varaValues from '../settings/vara-values';

export class IndianTime extends BaseObject {
  /*
    const dayOffset = dayBefore ? -1 : 0;
  const date = moment.utc(datetime).add(dayOffset, 'day');
  const year = date.year();
  const dayNum = date.dayOfYear();
  const muhurtaVal = progress * 30;
  const muhurta = Math.floor(muhurtaVal);
  const ghatiVal = progress * 60;
  const ghati = Math.floor(ghatiVal);
  const ghRemainder = ghatiVal % 1;
  const vighatiVal = ghRemainder * 60;
  const vighati = Math.floor(vighatiVal);
  const viRemainder = vighatiVal % 1;
  const lipta = viRemainder * 60;
  */

  _jDay = null;

  _sunData = null;

  date = moment.utc('0000-01-01T00:00:00');

  constructor(jDay: JyotishDay) {
    super();
    if (jDay instanceof JyotishDay) {
      this._jDay = jDay;
      this._sunData = jDay.sunData;
      const dayOffset = jDay.dayBefore() ? -1 : 0;
      this.date = moment.utc(jDay.datetime).add(dayOffset, 'day');
    }
  }

  jyotish = () => this._jDay;

  jd = () => this._jDay.jd;

  geo = () => this._jDay.geo;

  year = () => this.date.year();

  dayNum = () => this.date.dayOfYear();

  weekDayNum = () => {
    const isoDayIndex = this.date.isoWeekday();
    return isoDayIndex === 7 ? 1 : isoDayIndex + 1;
  };

  progress = () => this._jDay.progress();

  dayLength = () => this._jDay.dayLength();

  rise = () => this._sunData.rise;

  set = () => this._sunData.set;

  prevRise = () => this._sunData.prevRise;

  prevSet = () => this._sunData.prevSet;

  nextRise = () => this._sunData.nextRise;

  nextSet = () => this._sunData.nextSet;

  isDayTime = () => this._jDay.isDayTime();

  dayBefore = () => this._jDay.dayBefore();

  dayStart = () => this._jDay.dayStart();

  ghatiVal = () => this.progress() * 60;

  ghati = () => Math.floor(this.ghatiVal());

  muhurtaVal = () => this.progress() * 30;

  muhurta = () => Math.floor(this.muhurtaVal());

  vighatiVal = () => {
    const remainder = this.ghatiVal() % 1;
    return remainder * 60;
  };

  vighati = () => Math.floor(this.vighatiVal());

  lipta = () => {
    const remainder = this.vighatiVal() % 1;
    return remainder * 60;
  };

  vara = () => {
    const percent = ((this._jDay.jd - this.dayStart()) / this.dayLength()) * 100;
    const weekDayIndex = this.weekDayNum() - 1;
    if (weekDayIndex >= 0 && weekDayIndex < 7) {
      const varaRow = varaValues[weekDayIndex];
      return {
        ...varaRow,
        dayLength: this.dayLength(),
        percent,
      };
    }
  }

  sunData() {
    const keys = ['prevRise', 'prevSet', 'rise', 'set', 'nextRise','nextSet'];
    
    const items: Array<BodyTransition> = keys.map(type => {
      const tr = this[type]();
      return {
        type,
        jd: tr.jd,
        datetime: tr.dt,
      };
    });
    return items;
  }

  toValues() {
    const keys = [
      'year',
      'dayNum',
      'progress',
      'dayLength',
      'isDayTime',
      'dayBefore',
      'dayStart',
      'muhurta',
      'ghati',
      'vighati',
      'lipta',
      'weekDayNum',
    ];
    const mp = new Map<string, any>();
    keys.forEach(key => {
      mp.set(key, this[key]());
    });
    return hashMapToObject(mp);
  }
}

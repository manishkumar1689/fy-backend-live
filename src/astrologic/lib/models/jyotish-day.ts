import { BaseObject } from './base-object';
import { calcAstroWeekDayIndex, jdToDateTime } from '../date-funcs';

export class JyotishDay extends BaseObject {
  jd = 0;

  sunData = null;

  datetime = null;

  geo = null;

  constructor(sunData) {
    super();
    this.sunData = sunData;
    this.jd = sunData.jd;
    this.datetime = sunData.datetime;
    this.geo = sunData.geo;
  }

  rise = () => this.sunData.rise;

  set = () => this.sunData.set;

  prevSet = () => this.sunData.prevSet;

  prevRise = () => this.sunData.prevRise;

  nextRise = () => this.sunData.nextRise;

  dayBefore = () => {
    return this.jd < this.rise().jd && !this.isDayTime();
  };

  afterSunSet = () => this.jd > this.set().jd;

  dayStart = () => {
    return this.dayBefore()
      ? this.prevRise().jd
      : this.rise().jd < this.jd
      ? this.rise().jd
      : this.prevRise().jd;
  };

  dayLength = () =>
    this.dayBefore()
      ? this.rise().jd - this.prevRise().jd
      : this.nextRise().jd - this.rise().jd;

  startJd = () =>
    this.dayBefore()
      ? this.prevSet().jd
      : this.afterSunSet()
      ? this.set().jd
      : this.rise().jd < this.jd
      ? this.rise().jd
      : this.prevRise().jd;

  periodLength = () =>
    this.dayBefore()
      ? this.rise().jd - this.prevSet().jd
      : this.afterSunSet()
      ? this.nextRise().jd - this.set().jd
      : this.rise().jd < this.jd
      ? this.set().jd - this.rise().jd
      : this.set().jd - this.prevRise().jd;

  periodHours = () => this.periodLength() * 24;

  weekDay = () => calcAstroWeekDayIndex(this.datetime, !this.dayBefore());

  startDayJd = () => this.dayStart();

  jdTime = () => this.jd - this.dayStart();

  progress = () => this.jdTime() / this.dayLength();

  isDayTime = () => {
    const after = this.rise().jd < this.set().jd;
    const riseJd = after ? this.rise().jd : this.prevRise().jd;
    const prevAfter = this.prevRise().jd < this.prevSet().jd;
    const prevRiseJd = prevAfter ? this.prevRise().jd : this.prevRise().jd - 1;
    return (
      (this.jd > riseJd && this.jd < this.set().jd) ||
      (this.jd > prevRiseJd && this.jd < this.prevSet().jd)
    );
  };
}

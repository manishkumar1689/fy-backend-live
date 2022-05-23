export interface SignValue {
  sign: number;
  value: number;
  house?: number;
}

export interface SignHouse {
  house: number;
  sign: number;
  key?: string;
}

export interface BmMatchRow {
  k1: string;
  sendsDiff: number;
  sendsVal: number;
  k2: string;
  getsDiff: number;
  getsVal: number;
}

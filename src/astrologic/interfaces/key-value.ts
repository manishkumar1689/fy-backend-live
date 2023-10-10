
export interface KeyValue {
  key: string;
  value: number;
}

export interface NakshatraItem {
  index: number;
  num: number;
  percent: number, 
  ruler: string;
  yoni: number;
  [key: string]: any;
}
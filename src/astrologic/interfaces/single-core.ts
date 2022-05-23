import { GeoLoc } from '../lib/models/geo-loc';

export interface ChartRef {
  id: string;
  refNum: number;
}

export interface SingleCore {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  dt: string | Date;
  refKey: string;
  duplicate?: boolean;
  mainId?: string;
  paired?: ChartRef[];
}

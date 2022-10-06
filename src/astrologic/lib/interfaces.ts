import { KeyNumValue } from '../../lib/interfaces';

export interface KeyLabel {
  key: string;
  label: string;
}

export interface KeyName {
  key: string;
  name: string;
}

export interface KeyNameMax {
  key: string;
  name: string;
  maxScore?: number;
}

export interface LngLat {
  lat: number;
  lng: number;
  alt?: number;
}

export interface SignValueSet {
  sign: number;
  house?: number;
  values: KeyNumValue[];
}

export interface KeyLng {
  key: string;
  lng: number;
  sign?: number;
}

export interface SurfaceTSData {
  geo: LngLat;
  ascendant: number;
  tzOffset: number;
}

export interface AyanamshaItem {
  num: number;
  key: string;
  value: number;
  name: string;
}

export const DefaultAyanamshaItem: AyanamshaItem = {
  num: 27,
  key: 'true_citra',
  value: 23.3,
  name: 'True Citra',
};

export interface Toponym {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  type: string;
}

export interface ProtocolSettings {
  kuta: any;
  grahaDrishti: Map<string, number[]>;
  rashiDrishti: Map<number, number[]>;
}

export interface TransitJdSet {
  rise: number;
  set: number;
  mc: number;
  ic?: number;
}

export interface ProgressSetItem {
  jd: number;
  pd: number;
  bodies: KeyNumValue[];
  ayanamsha: number;
}

export interface GrahaLngs {
  su?: number;
  mo?: number;
  me?: number;
  ve?: number;
  ma?: number;
  ju?: number;
  sa?: number;
  ke?: number;
  ra?: number;
  as?: number;
  ds?: number;
}

export interface ProgressResult {
  jd: number;
  pd: number;
  bodies: GrahaLngs;
  ayanamsha: number;
  valid: boolean;
  applied: boolean;
}

export interface SynastryAspectMatch {
  deg: number;
  k1: string;
  k2: string;
  orb?: number;
  value?: number;
  distance?: number;
  key?: string;
  first?: number;
  ak1?: string;
  ak2?: string;
}

export interface TransitionItem {
  key: string;
  type: string;
  transposed: boolean;
  jd: number;
}

export interface Big5ScaleMap {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface JungianScaleMap {
  extrovert_introvert: number;
  sensing_intuiting: number;
  thinking_feeling: number;
  judging_perceiving: number;
}

export interface ScalePreferenceAnswer {
  readonly key: string;
  readonly value: number;
  readonly type?: string;
}

export interface FacetedSet {
  readonly key: string;
  readonly score?: number;
  readonly value?: number;
  readonly domain: string;
  readonly facet?: number;
  readonly subdomain?: number;
}

export interface SimpleResult {
  readonly value: number;
  readonly domain: string;
  readonly subdomain?: number;
}

export type ScaleScores = Big5ScaleMap[] | JungianScaleMap[];

export interface DeviceVersion {
  key: string;
  name: string;
  version: string;
  forceUpdate: boolean;
  valid?: boolean;
}
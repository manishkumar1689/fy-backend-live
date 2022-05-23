/*
Services to associate payment options with countries
*/

export interface PreferenceOption {
  readonly key: string;
  readonly prompt: string;
  readonly type: string;
  readonly domain?: string;
  readonly subdomain?: number;
  readonly inverted?: boolean;
  readonly options?: any[];
  readonly rules?: any[];
}

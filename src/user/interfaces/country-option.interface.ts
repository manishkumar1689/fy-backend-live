/*
Services to associate payment options with countries
*/

export interface CountryOption {
  readonly name: string;
  readonly fullName?: string;
  readonly l2: string;
  readonly l3: string;
  readonly num: number;
}

export interface StartEnd {
  start: number;
  end: number;
}

export interface NakshatraItem {
  key: string;
  key28?: string;
  offset27?: number;
  ruler?: string;
  goal?: string;
  gender?: string;
  yoni?: number | string;
  pada?: number;
  aksharas?: Array<string>;
  nadi?: string;
  degreeRange?: StartEnd;
  label?: string;
  yoniLabel?: string;
}

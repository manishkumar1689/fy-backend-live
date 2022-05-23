export interface Toponym {
  readonly name: string;
  readonly fullName?: string;
  readonly type: string;
  readonly lat: number;
  readonly lng: number;
  readonly alt?: number;
}

export interface SurveyItem {
  readonly key: string;
  readonly name: string;
  readonly multiscales?: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly range?: number[];
  readonly scaleParams?: any;
}

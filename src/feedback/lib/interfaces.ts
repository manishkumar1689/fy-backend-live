export interface BlockRecord {
  user: string;
  mode: string;
  mutual?: boolean;
  createdAt: Date;
  info?: any;
}

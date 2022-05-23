/*
Only used to validate role settings, refer to the status schema 
*/

export interface Role {
  readonly key: string;
  readonly name: string;
  readonly overrides: string[];
  readonly adminAccess: boolean;
  readonly appAccess: boolean;
  readonly permissions: string[];
}

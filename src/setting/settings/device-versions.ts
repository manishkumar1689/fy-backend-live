import { DeviceVersion } from "../lib/interfaces";

export const defaultDeviceVersions: DeviceVersion[] = [
  { 
    key: 'mobile__ios',
    name: 'IoS',
    version: '0.0.1',
    forceUpdate: false
  },
  {
    key: 'mobile__android',
    name: 'Android',
    version: '0.0.1',
    forceUpdate: false
  }
];
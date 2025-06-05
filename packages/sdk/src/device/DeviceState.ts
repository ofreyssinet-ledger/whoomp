export type DeviceState = {
  batteryLevel: number | null;
  clock: number | null;
  isWorn: boolean;
  charging: boolean;
  versionInfo: {
    harvard: string;
    boylston: string;
  } | null;
  realtimeHeartRateEnabled: boolean;
};

export const initialDeviceState: DeviceState = {
  batteryLevel: null,
  isWorn: false,
  charging: false,
  clock: null,
  versionInfo: null,
  realtimeHeartRateEnabled: false,
};

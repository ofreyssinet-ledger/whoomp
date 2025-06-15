import React from 'react';

type DisplayedDevice = {
  deviceName: string;
  deviceId: string;
  lastConnectedMs: number;
};

export const DisplayedDeviceContext =
  React.createContext<DisplayedDevice | null>(null);

export function useDisplayedDevice(): DisplayedDevice | null {
  const context = React.useContext(DisplayedDeviceContext);
  return context;
}

export function useDisplayedDeviceOrThrow(): DisplayedDevice {
  const context = useDisplayedDevice();
  if (!context) {
    throw new Error(
      'useDisplayedDevice must be used within a DisplayedDeviceProvider',
    );
  }
  return context;
}

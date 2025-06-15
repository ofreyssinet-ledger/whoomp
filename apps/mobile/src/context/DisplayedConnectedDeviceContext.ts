import {ConnectedDevice} from '@whoomp/sdk';
import React from 'react';

export const DisplayedConnectedDevice =
  React.createContext<ConnectedDevice | null>(null);

export function useDisplayedConnectedDevice(): ConnectedDevice | null {
  return React.useContext(DisplayedConnectedDevice);
}

export function useDisplayedConnectedDeviceThrowIfNull(): ConnectedDevice {
  const device = useDisplayedConnectedDevice();
  if (!device) {
    throw new Error('No connected device available.');
  }
  return device;
}

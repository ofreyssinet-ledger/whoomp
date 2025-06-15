import {ConnectedDevice} from '@whoomp/sdk';
import React from 'react';

export const ConnectedDevicesContext = React.createContext<Record<
  string,
  ConnectedDevice
> | null>(null);

export function useConnectedDevices(): Record<string, ConnectedDevice> {
  const connectedDevices = React.useContext(ConnectedDevicesContext);
  if (!connectedDevices) {
    throw new Error(
      'useConnectedDevices must be used within a ConnectedDevicesProvider',
    );
  }
  return connectedDevices;
}

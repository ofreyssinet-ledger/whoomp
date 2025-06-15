import {ConnectedDevice} from '@whoomp/sdk';
import {useCallback} from 'react';

export function useDisconnectFromDevice(connectedDevice: ConnectedDevice) {
  return useCallback(() => {
    connectedDevice.disconnect().catch(error => {
      console.error(
        `Failed to disconnect from device ${connectedDevice.id}:`,
        error,
      );
    });
  }, [connectedDevice]);
}

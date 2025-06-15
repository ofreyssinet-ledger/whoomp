import {useCallback} from 'react';
import {useConnectingContext} from '../context/ConnectingContext';

export function useConnectToDevice(deviceId: string) {
  const {connectingToDeviceId, connect, error, cancelConnecting} =
    useConnectingContext();

  return {
    connecting: deviceId === connectingToDeviceId,
    error,
    isConnectingToDevice: connectingToDeviceId === deviceId,
    connect: useCallback(() => {
      connect(deviceId);
    }, [connect, deviceId]),
    cancelConnecting: useCallback(() => {
      cancelConnecting();
    }, [cancelConnecting]),
  };
}

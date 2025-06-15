import {DisplayedConnectedDevice} from './DisplayedConnectedDeviceContext';
import React, {useEffect, useMemo, useState} from 'react';
import {useDisplayedDevice} from './DisplayedDeviceContext';
import {useSdk} from './SdkContext';
import {ConnectedDevice} from '@whoomp/sdk';

export function DisplayedConnectedDeviceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sdk = useSdk();
  const displayedDevice = useDisplayedDevice();
  const [connectedDevice, setConnectedDevice] =
    useState<ConnectedDevice | null>(null);

  useEffect(() => {
    let dead = false;
    if (displayedDevice) {
      sdk.observeConnectedDevices().subscribe(devices => {
        if (dead) return;
        const device = devices[displayedDevice.deviceId];
        if (device) {
          setConnectedDevice(device);
        } else {
          setConnectedDevice(null);
        }
      });
      return () => {
        dead = true;
      };
    } else {
      setConnectedDevice(null);
    }
  }, [displayedDevice, sdk]);

  return (
    <DisplayedConnectedDevice.Provider value={connectedDevice}>
      {children}
    </DisplayedConnectedDevice.Provider>
  );
}

import {AppStateContext} from './AppStateContext';
import React, {useEffect, useMemo, useState} from 'react';
import {DisplayedDeviceContext} from './DisplayedDeviceContext';
import {useStorage} from './StorageContext';

export function AppStateProvider({children}: {children: React.ReactNode}) {
  const [displayedDevice, setDisplayedDevice] = useState<{
    deviceName: string;
    deviceId: string;
    lastConnectedMs: number;
  } | null>(null);

  const appState = useMemo(
    () => ({
      setDisplayedDevice,
    }),
    [],
  );

  const storage = useStorage();

  useEffect(() => {
    storage
      .getLastConnectedDevice()
      .then(setDisplayedDevice)
      .catch(err => {
        console.error('Failed to load last connected device:', err);
      });
  }, []);

  return (
    <AppStateContext.Provider value={appState}>
      <DisplayedDeviceContext.Provider value={displayedDevice}>
        {children}
      </DisplayedDeviceContext.Provider>
    </AppStateContext.Provider>
  );
}

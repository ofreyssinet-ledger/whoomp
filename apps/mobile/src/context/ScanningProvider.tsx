import React, {useEffect} from 'react';
import {ToggleScanningContext} from './ToggleScanningContext';
import {DiscoveredDevice} from '@whoomp/sdk';
import {useSdk} from './SdkContext';
import {Subscription, throttleTime} from 'rxjs';
import {ScanningContext} from './ScanningContext';

export function ScanningProvider({children}: {children: React.ReactNode}) {
  const sdk = useSdk();
  const [scanning, setScanning] = React.useState(false);
  const [devices, setDevices] = React.useState<DiscoveredDevice[]>([]);
  const [error, setError] = React.useState<Error | null>(null);

  const startScanning = React.useCallback(async () => {
    setScanning(true);
    setDevices([]);
    setError(null);
  }, [sdk]);

  const stopScanning = React.useCallback(() => {
    setScanning(false);
  }, [sdk]);

  const toggleScanningValue = React.useMemo(() => {
    return {
      stopScanning,
      startScanning,
      scanning,
    };
  }, [scanning, startScanning, stopScanning]);

  useEffect(() => {
    let subscription: Subscription | null = null;
    if (scanning) {
      subscription = sdk
        .getDevices()
        .pipe(throttleTime(1000))
        .subscribe({
          next: devices => {
            setDevices(prevDevices => {
              const newDevices = devices.filter(
                d => !prevDevices.some(pd => pd.id === d.id),
              );
              return [...prevDevices, ...newDevices];
            });
          },
          error: err => {
            setError(err);
            stopScanning();
          },
          complete: () => {
            stopScanning();
          },
        });
      return () => {
        subscription?.unsubscribe();
      };
    } else {
    }
  }, [scanning, sdk]);

  const scanningValue = React.useMemo(() => {
    return {
      scanning,
      discoveredDevices: devices,
      error,
    };
  }, [scanning, devices, error]);

  return (
    <ToggleScanningContext.Provider value={toggleScanningValue}>
      <ScanningContext.Provider value={scanningValue}>
        {children}
      </ScanningContext.Provider>
    </ToggleScanningContext.Provider>
  );
}

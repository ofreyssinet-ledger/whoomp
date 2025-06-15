import React, {useEffect} from 'react';
import {ConnectingContext} from './ConnectingContext';
import {useSdk} from './SdkContext';
import {useToggleScanning} from './ToggleScanningContext';
import {Alert} from 'react-native';
import {useDisplayedDevice} from './DisplayedDeviceContext';
import {useAppState} from './AppStateContext';

export const ConnectingProvider = ({children}: {children: React.ReactNode}) => {
  const sdk = useSdk();
  const {setDisplayedDevice} = useAppState();
  const {scanning, stopScanning} = useToggleScanning();
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [connected, setConnected] = React.useState(false);

  const connect = React.useCallback(
    async (deviceId: string) => {
      setDeviceId(deviceId);
      setConnected(false);
      setError(null);
    },
    [sdk, deviceId],
  );

  const cancelConnecting = React.useCallback(() => {
    setDeviceId(null);
    setConnected(false);
    setError(null);
  }, [sdk, deviceId]);

  useEffect(() => {
    let dead = false;
    if (deviceId && scanning) {
      stopScanning();
    } else if (deviceId) {
      sdk
        .connectToDevice(deviceId, () => {
          if (!dead) {
            setConnected(false);
            setDeviceId(null);
          }
        })
        .then(device => {
          if (!dead) {
            setConnected(true);
            setDisplayedDevice({
              deviceId: device.id,
              deviceName: device.name,
              lastConnectedMs: Date.now(),
            });
            setDeviceId(null);
          }
        })
        .catch(err => {
          Alert.alert(
            'Connection Error',
            `Failed to connect to device ${deviceId}: ${err.message}`,
          );
          if (!dead) {
            setError(err.message);
            setDeviceId(null);
          }
        });
      return () => {
        dead = true;
      };
    }
  }, [deviceId, scanning, sdk, stopScanning]);

  const connectingValue = React.useMemo(() => {
    return {
      connectingToDeviceId: deviceId,
      connecting: Boolean(deviceId),
      error,
      connected,
      connect,
      cancelConnecting,
    };
  }, [deviceId, error, connected, connect, cancelConnecting]);

  return (
    <ConnectingContext.Provider value={connectingValue}>
      {children}
    </ConnectingContext.Provider>
  );
};

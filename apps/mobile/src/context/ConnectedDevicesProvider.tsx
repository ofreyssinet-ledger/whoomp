import {useMemo} from 'react';
import {useStateFromObservable} from '../hooks/useStateFromObservable';
import {ConnectedDevicesContext} from './ConnectedDevicesContext';
import {useSdk} from './SdkContext';

export function ConnectedDevicesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sdk = useSdk();

  const connectedDevicesObservable = useMemo(() => {
    return sdk.observeConnectedDevices();
  }, [sdk]);

  const connectedDevices = useStateFromObservable(connectedDevicesObservable);
  return (
    <ConnectedDevicesContext.Provider value={connectedDevices}>
      {children}
    </ConnectedDevicesContext.Provider>
  );
}

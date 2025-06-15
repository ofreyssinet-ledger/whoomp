import React, {useContext} from 'react';

export type ConnectingContextType = {
  connecting: boolean;
  connectingToDeviceId: string | null;
  error: Error | null;
  connect: (deviceId: string) => Promise<void>;
  cancelConnecting: () => void;
};

export const ConnectingContext =
  React.createContext<ConnectingContextType | null>(null);

export function useConnectingContext(): ConnectingContextType {
  const context = useContext(ConnectingContext);
  if (!context) {
    throw new Error(
      'useConnectionContext must be used within a ConnectingProvider',
    );
  }
  return context;
}

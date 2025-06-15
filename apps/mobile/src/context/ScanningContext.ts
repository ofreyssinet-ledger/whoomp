import {DiscoveredDevice} from '@whoomp/sdk';

type ScanningContext = {
  scanning: boolean;
  discoveredDevices: DiscoveredDevice[];
  error: Error | null;
};

import React from 'react';
export const ScanningContext = React.createContext<ScanningContext | null>(
  null,
);
export function useScanningContext(): ScanningContext {
  const context = React.useContext(ScanningContext);
  if (!context) {
    throw new Error(
      'useScanningContext must be used within a ScanningProvider',
    );
  }
  return context;
}

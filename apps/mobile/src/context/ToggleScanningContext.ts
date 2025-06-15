type ToggleScanningContextType = {
  scanning: boolean;
  startScanning: () => void;
  stopScanning: () => void;
};
import React from 'react';

export const ToggleScanningContext =
  React.createContext<ToggleScanningContextType | null>(null);

export function useToggleScanning(): ToggleScanningContextType {
  const context = React.useContext(ToggleScanningContext);
  if (!context) {
    throw new Error(
      'useToggleScanning must be used within a ToggleScanningProvider',
    );
  }
  return context;
}

import React from 'react';

type DisplayedDevice = {
  deviceName: string;
  deviceId: string;
  lastConnectedMs: number;
};

type AppState = {
  setDisplayedDevice: (device: DisplayedDevice | null) => void;
};

export const AppStateContext = React.createContext<AppState | null>(null);

export function useAppState(): AppState {
  const context = React.useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

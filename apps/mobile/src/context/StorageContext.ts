import React from 'react';
import {Storage} from '@whoomp/sdk';

export const StorageContext = React.createContext<Storage | null>(null);

export function useStorage(): Storage {
  const context = React.useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}

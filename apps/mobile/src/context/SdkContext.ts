import {Sdk} from '@whoomp/sdk';
import React from 'react';

export const SdkContext = React.createContext<Sdk | null>(null);

export function useSdk(): Sdk {
  const sdk = React.useContext(SdkContext);
  if (!sdk) {
    throw new Error('useSdk must be used within a SdkProvider');
  }
  return sdk;
}

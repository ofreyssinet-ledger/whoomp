import {SdkContext} from './SdkContext';

import {Sdk} from '@whoomp/sdk';
import React, {useEffect, useState} from 'react';
import {AppState, Platform} from 'react-native';
import {ReactNativeBleTransport} from '../RNBleTransport';
import {useStorage} from './StorageContext';

export function SdkProvider({children}: {children: React.ReactNode}) {
  const storage = useStorage();

  const [sdk] = useState(() => {
    const transport = new ReactNativeBleTransport();
    return new Sdk(transport, storage);
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        sdk.resume();
      } else if (Platform.OS === 'ios' && nextAppState === 'inactive') {
        sdk.pause();
      } else if (Platform.OS !== 'ios') {
        sdk.pause();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [sdk]);

  return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>;
}

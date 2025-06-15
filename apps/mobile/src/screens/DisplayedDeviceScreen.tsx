import React from 'react';
import {View} from 'react-native';
import Header from '../components/Header';

export function DisplayedDeviceScreen() {
  return (
    <View style={{flex: 1, width: '100%', paddingHorizontal: 16}}>
      <Header />
    </View>
  );
}

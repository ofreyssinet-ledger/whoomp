import React from 'react';
import {Button, View} from 'react-native';
import Header from '../components/Header';
import {useStorage} from '../context/StorageContext';
import {migrateHistoricalDataDumps} from '../data/MobileStorage';

export function DisplayedDeviceScreen() {
  const storage = useStorage();

  return (
    <View style={{flex: 1, width: '100%', paddingHorizontal: 16}}>
      <Header />
      <Button
        title="Migrate data dumps"
        onPress={() => {
          try {
            migrateHistoricalDataDumps(storage);
          } catch (error) {
            console.error('Migration failed:', error);
          }
        }}
      />
      <Button
        title="Fetch all historical data"
        onPress={() => {
          try {
            storage.getHistoricalDataDumpNew().then(data => {
              console.log('Fetched historical data:', data);
            });
          } catch (error) {
            console.error('Fetch failed:', error);
          }
        }}
      />
      <Button
        title="Fetch all 1min data"
        onPress={() => {
          try {
            storage.getHeartRateAverage2min().then(data => {
              console.log('Fetched 1min data:', data);
            });
          } catch (error) {
            console.error('Fetch failed:', error);
          }
        }}
      />
    </View>
  );
}

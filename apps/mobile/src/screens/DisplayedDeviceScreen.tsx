import React from 'react';
import {Button, Text, View} from 'react-native';
import Header from '../components/Header';
import {useStorage} from '../context/StorageContext';
import {migrateHistoricalDataDumps} from '../data/MobileStorage';
import {useDrizzleDB} from '../hooks/useDrizzleDB';
import {useLiveQuery} from 'drizzle-orm/expo-sqlite';
import {restingHeartRate24h} from '../db/schema';
import {
  useDisplayedDevice,
  useDisplayedDeviceOrThrow,
} from '../context/DisplayedDeviceContext';
import {desc, eq} from 'drizzle-orm';

const RestHeartRate = () => {
  const drizzleDB = useDrizzleDB();
  const device = useDisplayedDeviceOrThrow();
  const {data: lastRHRData} = useLiveQuery(
    drizzleDB
      .select()
      .from(restingHeartRate24h)
      .where(eq(restingHeartRate24h.deviceName, device.deviceName))
      .orderBy(desc(restingHeartRate24h.timestampMs))
      .limit(1),
  );

  const lastRHRDataPoint = lastRHRData?.[0];

  if (!lastRHRDataPoint) {
    return null;
  }

  const lastRHRDataPointTime = new Date(lastRHRDataPoint.timestampMs);

  return (
    <View style={{marginTop: 16}}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>Resting Heart Rate</Text>
      <Text style={{fontSize: 14}}>
        RHR: {Math.round(lastRHRDataPoint.heartRate)} bpm
        {'\n'}
        In the 24h prior to: {lastRHRDataPointTime.toLocaleString()}
      </Text>
    </View>
  );
};

export function DisplayedDeviceScreen() {
  const storage = useStorage();

  return (
    <View style={{flex: 1, width: '100%', paddingHorizontal: 16}}>
      <Header />
      <RestHeartRate />

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

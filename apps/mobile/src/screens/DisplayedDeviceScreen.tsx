import {desc, eq} from 'drizzle-orm';
import {useLiveQuery} from 'drizzle-orm/expo-sqlite';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Header from '../components/Header';
import {useDisplayedConnectedDevice} from '../context/DisplayedConnectedDeviceContext';
import {useDisplayedDeviceOrThrow} from '../context/DisplayedDeviceContext';
import {restingHeartRate24h} from '../db/schema';
import {useDrizzleDB} from '../hooks/useDrizzleDB';
import {DailyScreen} from './DailyScreen';

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
  return (
    <View style={{flex: 1, width: '100%'}}>
      <Header />
      <DailyScreen />
    </View>
  );
}

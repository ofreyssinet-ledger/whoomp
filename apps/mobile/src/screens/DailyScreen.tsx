import {AverageHRDataSet, RHRDataSet} from '@whoomp/sdk';
import React, {useEffect, useState} from 'react';
import {useDisplayedDeviceOrThrow} from '../context/DisplayedDeviceContext';
import {useSdk} from '../context/SdkContext';
import {DayData} from '../model/dayData';
import {DayView} from '../components/DayView/DayView';
import {Text, FlatList, useWindowDimensions} from 'react-native';
import {useLastSyncDate} from '../hooks/useLastSyncDate';

function splitAnalysedDataInDayChunks(
  endTimestampMs: number,
  data: {
    hrAvg1min: AverageHRDataSet;
    hrAvg2min: AverageHRDataSet;
    hrAvg5min: AverageHRDataSet;
    rhr24h: RHRDataSet;
  },
): Array<DayData> {
  const dayMS = 24 * 60 * 60 * 1000;
  const dayMap = new Map<number, DayData>();

  // Helper function to get day key from timestamp
  const getDayKey = (timestampMs: number) => {
    const date = new Date(timestampMs);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    ).getTime();
    return dayStart;
  };

  // Helper function to ensure day exists in map
  const ensureDay = (dayKey: number) => {
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        chunkStartMs: dayKey,
        chunkEndMs: dayKey + dayMS,
        hrAvg1min: [],
        hrAvg2min: [],
        hrAvg5min: [],
        rhr24h: [],
      });
    }
    return dayMap.get(dayKey)!;
  };

  // Process hrAvg1min data
  data.hrAvg1min.forEach(dataPoint => {
    const dayKey = getDayKey(dataPoint.timestampMs);
    const day = ensureDay(dayKey);
    day.hrAvg1min.push(dataPoint);
  });

  // Process hrAvg2min data
  data.hrAvg2min.forEach(dataPoint => {
    const dayKey = getDayKey(dataPoint.timestampMs);
    const day = ensureDay(dayKey);
    day.hrAvg2min.push(dataPoint);
  });

  // Process hrAvg5min data
  data.hrAvg5min.forEach(dataPoint => {
    const dayKey = getDayKey(dataPoint.timestampMs);
    const day = ensureDay(dayKey);
    day.hrAvg5min.push(dataPoint);
  });

  // Process rhr24h data
  data.rhr24h.forEach(dataPoint => {
    const dayKey = getDayKey(dataPoint.timestampMs);
    const day = ensureDay(dayKey);
    day.rhr24h.push(dataPoint);
  });

  // Convert map to array and sort by day (newest first)
  return Array.from(dayMap.values()).sort(
    (a, b) => b.chunkStartMs - a.chunkStartMs,
  );
}

export const DailyScreen = React.memo(() => {
  const displayedDevice = useDisplayedDeviceOrThrow();
  const sdk = useSdk();

  const [data, setData] = useState<Array<DayData>>([]);
  const [minMaxHR, setMinMaxHR] = useState<{minHR: number; maxHR: number}>({
    minHR: 0,
    maxHR: 240,
  });

  const windowSize = useWindowDimensions();

  const lastSyncDate = useLastSyncDate();

  useEffect(() => {
    let dead = false;
    sdk.getAnalysedData(displayedDevice.deviceName).then(analysedData => {
      if (dead) return;
      const lastAnalysedTimestampMs =
        analysedData.hrAvg1min[analysedData.hrAvg1min.length - 1]?.timestampMs;

      const d = new Date(lastAnalysedTimestampMs);
      const base = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
        0,
      ).getTime();
      const endTimestampMs = base + 24 * 60 * 60 * 1000; // end of the day

      const dayChunks = splitAnalysedDataInDayChunks(
        endTimestampMs,
        analysedData,
      );
      const minHR = Math.min(...analysedData.hrAvg1min.map(p => p.heartRate));
      const maxHR = Math.max(...analysedData.hrAvg1min.map(p => p.heartRate));
      setMinMaxHR({minHR, maxHR});
      setData(dayChunks);
    });
    return () => {
      dead = true;
    };
  }, [displayedDevice.deviceName, sdk, lastSyncDate?.getTime()]);

  if (data.length === 0) {
    return <Text>No data available for the selected device.</Text>;
  }
  return (
    <FlatList
      data={data}
      horizontal={true}
      snapToInterval={windowSize.width}
      decelerationRate={0.997}
      snapToAlignment="start"
      inverted={true}
      renderItem={({item}) => <DayView data={item} minMaxHR={minMaxHR} />}
      keyExtractor={(item, index) => index.toString()}
    />
  );
});

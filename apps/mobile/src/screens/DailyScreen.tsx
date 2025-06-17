import {AverageHRDataSet, RHRDataSet} from '@whoomp/sdk';
import React, {useEffect, useState} from 'react';
import {useDisplayedDeviceOrThrow} from '../context/DisplayedDeviceContext';
import {useSdk} from '../context/SdkContext';
import {DayData} from '../model/dayData';
import {DayView} from '../components/DayView';
import {Text, FlatList} from 'react-native';
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
  const startTimestampMs = data.hrAvg1min[0]?.timestampMs || 0;
  const dayIntervals = [];
  const dayMS = 24 * 60 * 60 * 1000;

  function filterDataPoint(fromTimestamp: number, toTimestampNumber: number) {
    return (dataPoint: {timestampMs: number}) =>
      dataPoint.timestampMs >= fromTimestamp &&
      dataPoint.timestampMs < toTimestampNumber;
  }

  for (let t = endTimestampMs; t >= startTimestampMs; t -= dayMS) {
    const filterFn = filterDataPoint(t - dayMS, t);
    dayIntervals.push({
      chunkStartMs: t - dayMS,
      chunkEndMs: t,
      hrAvg1min: data.hrAvg1min.filter(filterFn),
      hrAvg2min: data.hrAvg2min.filter(filterFn),
      hrAvg5min: data.hrAvg5min.filter(filterFn),
      rhr24h: data.rhr24h.filter(filterFn),
    });
  }
  return dayIntervals;
}

export const DailyScreen = React.memo(() => {
  const displayedDevice = useDisplayedDeviceOrThrow();
  const sdk = useSdk();

  const [data, setData] = useState<Array<DayData>>([]);
  const [minMaxHR, setMinMaxHR] = useState<{minHR: number; maxHR: number}>({
    minHR: 0,
    maxHR: 240,
  });

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
      inverted={true}
      renderItem={({item}) => <DayView data={item} minMaxHR={minMaxHR} />}
      keyExtractor={(item, index) => index.toString()}
    />
  );
});

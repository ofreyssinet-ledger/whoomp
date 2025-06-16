import {AverageHRDataSet, RHRDataSet} from '@whoomp/sdk';
import {useEffect, useState} from 'react';
import {useDisplayedDeviceOrThrow} from '../context/DisplayedDeviceContext';
import {useSdk} from '../context/SdkContext';
import {DayData} from '../model/dayData';
import {DayView} from '../components/DayView';
import {Text, FlatList} from 'react-native';

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

export function DailyScreen() {
  const displayedDevice = useDisplayedDeviceOrThrow();
  const sdk = useSdk();

  const [data, setData] = useState<Array<DayData>>([]);

  useEffect(() => {
    let dead = false;
    sdk.getAnalysedData(displayedDevice.deviceName).then(analysedData => {
      if (dead) return;
      const endTimestampMs =
        analysedData.hrAvg1min[analysedData.hrAvg1min.length - 1]?.timestampMs;
      const dayChunks = splitAnalysedDataInDayChunks(
        endTimestampMs,
        analysedData,
      );
      setData(dayChunks);
    });
    return () => {
      dead = true;
    };
  }, [displayedDevice.deviceName, sdk]);

  if (data.length === 0) {
    return <Text>No data available for the selected device.</Text>;
  }
  return (
    <FlatList
      data={data}
      horizontal={true}
      inverted={true}
      renderItem={({item}) => <DayView data={item} />}
      keyExtractor={(item, index) => index.toString()}
    />
  );
}

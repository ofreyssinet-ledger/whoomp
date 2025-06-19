import React, {useMemo} from 'react';
import {View, Text, useWindowDimensions} from 'react-native';
import {DayData} from '../../model/dayData';
import {formatRelativeDate} from '../../helpers/formatRelativeDate';
import {DayGraph} from './DayGraph';

type Props = {
  data: DayData;
  minMaxHR: {minHR: number; maxHR: number};
};

const RestHeartRate = ({
  rhrPoint,
}: {
  rhrPoint: {heartRate: number; measuredAtMs: number};
}) => {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        marginBottom: 16,
        alignItems: 'flex-start',
        alignSelf: 'flex-start',
        opacity: rhrPoint.heartRate > 0 ? 1 : 0,
      }}>
      <Text
        style={{
          fontSize: 16,
          alignSelf: 'flex-start',
          color: '#555',
        }}>
        RHR
      </Text>
      <Text style={{fontSize: 30, fontWeight: 'bold', marginTop: 4}}>
        {Math.round(rhrPoint.heartRate)}
        <Text style={{fontSize: 17}}> bpm</Text>
      </Text>
      <Text style={{fontSize: 10, marginTop: 4}}>
        {formatRelativeDate(rhrPoint.measuredAtMs, true)}
      </Text>
    </View>
  );
};

export const DayView = ({data, minMaxHR}: Props) => {
  const rhrPoint = useMemo(() => {
    return (
      data.rhr24h[data.rhr24h.length - 1] ?? {heartRate: 0, measuredAtMs: 0}
    );
  }, [data.rhr24h]);

  const windowSize = useWindowDimensions();
  return (
    <View style={{marginTop: 16, width: windowSize.width}}>
      <View style={{padding: 16}}>
        <Text style={{fontSize: 48, fontWeight: 'bold', marginBottom: 16}}>
          {formatRelativeDate(data.chunkEndMs - 1)}
        </Text>
      </View>
      <DayGraph data={data} minMaxHR={minMaxHR} />
      <View style={{padding: 16, marginTop: 16}}>
        {rhrPoint && <RestHeartRate rhrPoint={rhrPoint} />}
      </View>

      {/* Add similar sections for hrAvg2min, hrAvg5min, and rhr24h */}
    </View>
  );
};

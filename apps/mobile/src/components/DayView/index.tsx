import React from 'react';
import {View, Text, useWindowDimensions} from 'react-native';
import {DayData} from '../../model/dayData';
import {formatRelativeDate} from '../../helpers/formatRelativeDate';

type Props = {
  data: DayData;
};

export const DayView = ({data}: Props) => {
  const rhrPoint = data.rhr24h[data.rhr24h.length - 1];
  const windowSize = useWindowDimensions();
  return (
    <View style={{marginTop: 16, width: windowSize.width}}>
      <View style={{padding: 16}}>
        <Text style={{fontSize: 48, fontWeight: 'bold', marginBottom: 16}}>
          {formatRelativeDate(data.chunkEndMs)}
        </Text>
        <Text>Chunk Start: {new Date(data.chunkStartMs).toLocaleString()}</Text>
        <Text>Chunk End: {new Date(data.chunkEndMs).toLocaleString()}</Text>

        <Text>
          RHR: {Math.round(rhrPoint?.heartRate)} (measured at{' '}
          {new Date(rhrPoint?.measuredAtMs).toLocaleString()})
        </Text>
        <Text>1-Minute Average HR Data size: {data.hrAvg1min.length}</Text>
      </View>
      <DayGraph data={data} />

      {/* Add similar sections for hrAvg2min, hrAvg5min, and rhr24h */}
    </View>
  );
};

const DayGraph = ({data}: {data: DayData}) => {
  // Placeholder for future graph implementation
  return (
    <View
      style={{
        height: 200,
        backgroundColor: '#f0f0f0',
        marginTop: 16,
        borderWidth: 1,
      }}>
      <Text style={{textAlign: 'center', paddingTop: 80}}>
        Graph will be implemented here
      </Text>
    </View>
  );
};

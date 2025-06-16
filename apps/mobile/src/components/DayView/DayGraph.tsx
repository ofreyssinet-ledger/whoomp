import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {CartesianChart, Line} from 'victory-native';
import {useFont} from '@shopify/react-native-skia';

import {DayData} from '../../model/dayData';

type Props = {data: DayData; width: number | string};

export const DayGraph: React.FC<Props> = ({data, width}) => {
  const {chunkStartMs, chunkEndMs, hrAvg1min, rhr24h} = data;
  //   const font = useFont(require('../../../assets/fonts/Inter-Medium.ttf'), 16);

  const startOfDay = useMemo(() => {
    const d = new Date(chunkStartMs);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, [chunkStartMs]);
  const firstMidnight =
    chunkStartMs <= startOfDay ? startOfDay : startOfDay + 86_400_000;

  const xTicks = useMemo(() => {
    const startDate = new Date(chunkStartMs);
    const localHour = startDate.getHours();
    const baseHour = Math.floor(localHour / 6) * 6;
    const baseTick = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      baseHour,
      0,
      0,
      0,
    ).getTime();
    // generate five 6h‐apart ticks, then filter to [start, end)
    return Array.from(
      {length: 5},
      (_, i) => baseTick + i * 6 * 60 * 60 * 1000,
    ).filter(t => t >= chunkStartMs && t < chunkEndMs);
  }, [chunkStartMs, chunkEndMs]);

  const yTicks = useMemo(() => {
    return Array.from(
      {length: Math.floor((230 - 25) / 25) + 1},
      (_, i) => (i + 1) * 25,
    );
  }, []);

  const formatX = (ms: number) => {
    if (ms === firstMidnight) {
      return new Date(ms).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
      });
    }
    return `${new Date(ms).getHours()}h`;
  };

  const combined = useMemo(() => {
    const map = new Map(rhr24h.map(p => [p.timestampMs, p.heartRate]));
    return hrAvg1min.map(p => ({
      timestamp: p.timestampMs,
      hr: p.heartRate,
      rhr: map.get(p.timestampMs) ?? undefined,
    }));
  }, [hrAvg1min, rhr24h]);

  return (
    <View style={[styles.container]}>
      <CartesianChart
        data={combined}
        xKey="timestamp"
        yKeys={['hr', 'rhr']}
        domain={{x: [chunkStartMs, chunkEndMs], y: [30, 230]}}
        xAxis={{tickValues: xTicks, formatXLabel: formatX, labelColor: 'black'}}
        yAxis={[
          {tickValues: yTicks, formatYLabel: v => `${v}`, labelColor: 'black'},
        ]}>
        {({points}) => (
          <>
            <Line points={points.hr} color="red" strokeWidth={2} />
            <Line points={points.rhr} color="blue" strokeWidth={2} />
          </>
        )}
      </CartesianChart>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, width: '100%', height: 300},
});

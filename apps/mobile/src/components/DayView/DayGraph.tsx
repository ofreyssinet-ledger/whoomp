import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {CartesianChart, Line} from 'victory-native';
import {useFont} from '@shopify/react-native-skia';

import {DayData} from '../../model/dayData';
// @ts-expect-error
import interFont from '../../../assets/fonts/Inter.ttf';

type Props = {
  data: DayData;
  width: number | string;
  minMaxHR: {minHR: number; maxHR: number};
};

export const DayGraph: React.FC<Props> = React.memo(
  ({data, width, minMaxHR}) => {
    const {chunkStartMs, chunkEndMs, hrAvg1min, rhr24h} = data;

    const displayedAvgHR = hrAvg1min;

    const {minHR, maxHR} = minMaxHR;
    const font = useFont(interFont, 16);

    console.log({minMaxHR});

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
        {length: Math.floor(maxHR / 25) + 1},
        (_, i) => (i + 1) * 25,
      );
    }, [maxHR]);

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
      return displayedAvgHR.map(p => ({
        timestamp: p.timestampMs,
        hr: p.heartRate,
        rhr: map.get(p.timestampMs) ?? undefined,
      }));
    }, [displayedAvgHR, rhr24h]);

    return (
      <View style={[styles.container]}>
        <CartesianChart
          data={combined}
          xKey="timestamp"
          yKeys={['hr', 'rhr']}
          domain={{x: [chunkStartMs, chunkEndMs], y: [minHR, maxHR + 10]}}
          xAxis={{
            tickValues: xTicks,
            formatXLabel: formatX,
            labelColor: 'grey',
            font,
            labelOffset: -40,
          }}
          yAxis={[
            {
              tickValues: yTicks,
              formatYLabel: v => `${v}`,
              labelColor: 'grey',
              //   font,
              labelOffset: 0,
            },
          ]}>
          {({points}) => (
            <>
              <Line points={points.hr} color="#fe2c55" strokeWidth={2} />
              {/* <Line points={points.rhr} color="blue" strokeWidth={2} /> */}
            </>
          )}
        </CartesianChart>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {width: '100%', flex: 1},
});

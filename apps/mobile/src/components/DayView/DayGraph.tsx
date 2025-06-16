import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {CartesianChart, Line} from 'victory-native';
import {useFont} from '@shopify/react-native-skia';

import {DayData} from '../../model/dayData';
// @ts-expect-error
import interFont from '../../../assets/fonts/Inter.ttf';

// Toggle log scale on/off
const USE_LOG_SCALE = true;

type Props = {
  data: DayData;
  width: number | string;
  minMaxHR: {minHR: number; maxHR: number};
};

export const DayGraph: React.FC<Props> = React.memo(
  ({data, width, minMaxHR}) => {
    const {chunkStartMs, chunkEndMs, hrAvg1min, hrAvg2min, hrAvg5min, rhr24h} =
      data;
    const displayedAvgHR = hrAvg2min;
    const {minHR, maxHR} = minMaxHR;

    const font = useFont(interFont, 16);

    // x-axis ticks every 6h
    const xTicks = useMemo(() => {
      const d = new Date(chunkStartMs);
      const baseHour = Math.floor(d.getHours() / 6) * 6;
      const base = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        baseHour,
        0,
        0,
        0,
      ).getTime();
      return Array.from({length: 5}, (_, i) => base + i * 21_600_000) // 6h
        .filter(t => t >= chunkStartMs && t < chunkEndMs);
    }, [chunkStartMs, chunkEndMs]);

    // linear y-ticks
    const yTicks = useMemo(
      () =>
        Array.from(
          {length: Math.floor(maxHR / 25) + 1},
          (_, i) => (i + 1) * 25,
        ),
      [maxHR],
    );

    // log-transformed y-ticks
    const logYTicks = USE_LOG_SCALE ? yTicks.map(v => Math.log10(v)) : [];

    // x-axis label formatter
    const formatX = (ms: number) => {
      const h = new Date(ms).getHours();
      return h === 0
        ? new Date(ms).toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
          })
        : `${h}h`;
    };

    // prepare your data, applying log10 if needed
    const combined = useMemo(() => {
      const map = new Map(rhr24h.map(p => [p.timestampMs, p.heartRate]));
      return displayedAvgHR.map(p => {
        const hrVal = p.heartRate;
        const rhrVal = map.get(p.timestampMs);
        return {
          timestamp: p.timestampMs,
          hr: USE_LOG_SCALE ? Math.log10(hrVal) : hrVal,
          rhr:
            rhrVal == null
              ? undefined
              : USE_LOG_SCALE
              ? Math.log10(rhrVal)
              : rhrVal,
        };
      });
    }, [displayedAvgHR, rhr24h]);

    if (!font) return null;

    return (
      <View style={[styles.container]}>
        <CartesianChart
          data={combined}
          xKey="timestamp"
          yKeys={['hr', 'rhr']}
          domain={{
            x: [chunkStartMs, chunkEndMs],
            y: USE_LOG_SCALE
              ? [Math.log10(minHR), Math.log10(maxHR + 10)]
              : [minHR, maxHR + 10],
          }}
          xAxis={{
            tickValues: xTicks,
            formatXLabel: formatX,
            labelColor: 'grey',

            font,
            labelPosition: 'inset',
          }}
          padding={{left: 0}}
          yAxis={[
            {
              tickValues: USE_LOG_SCALE ? logYTicks : yTicks,
              formatYLabel: v =>
                USE_LOG_SCALE ? `${Math.round(10 ** (v ?? 0))}` : `${v}`,
              labelColor: 'grey',
              font,
              labelPosition: 'inset',
            },
          ]}>
          {({points}) => (
            <>
              <Line
                points={points.hr}
                color="#fe2c55"
                strokeWidth={1}
                curveType="linear"
              />
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

import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {CartesianChart, Line} from 'victory-native';
import {LinearGradient, useFont, vec} from '@shopify/react-native-skia';

import {DayData} from '../../model/dayData';
// @ts-expect-error
import interFont from '../../../assets/fonts/Inter.ttf';

// Toggle log scale on/off
const USE_LOG_SCALE = true;

enum DisplayedAvg {
  HR_1MIN = 'hrAvg1min',
  HR_2MIN = 'hrAvg2min',
  HR_5MIN = 'hrAvg5min',
}

type Props = {
  data: DayData;
  width: number | string;
  minMaxHR: {minHR: number; maxHR: number};
  displayedAvg?: DisplayedAvg;
};

const DEFAULT_DISPLAYED_AVG: DisplayedAvg = DisplayedAvg.HR_5MIN;

export const DayGraph: React.FC<Props> = React.memo(
  ({data, width, minMaxHR, displayedAvg = DEFAULT_DISPLAYED_AVG}) => {
    const {chunkStartMs, chunkEndMs, hrAvg1min, hrAvg2min, hrAvg5min, rhr24h} =
      data;
    const displayedAvgHR = useMemo(() => {
      switch (displayedAvg) {
        case DisplayedAvg.HR_1MIN:
          return hrAvg1min;
        case DisplayedAvg.HR_2MIN:
          return hrAvg2min;
        case DisplayedAvg.HR_5MIN:
          return hrAvg5min;
        default:
          return hrAvg2min; // Fallback to 2-minute average
      }
    }, [hrAvg1min, hrAvg2min, hrAvg5min]);

    const {minHR, maxHR} = minMaxHR;

    const font = useFont(interFont, 16);

    // x-axis ticks every 3h
    const xTicks = useMemo(() => {
      const d = new Date(chunkStartMs);
      const baseHour = Math.floor(d.getHours() / 3) * 3;
      const base = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        baseHour,
        0,
        0,
        0,
      ).getTime();
      return Array.from({length: 10}, (_, i) => base + i * 3 * 3600 * 1000) // 3h
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
      const date = new Date(ms).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
      });
      const h = new Date(ms).getHours();
      return h === 0 ? `0h 0h` : `      ${h}h`;
    };

    // prepare your data, applying log10 if needed
    const combined = useMemo(() => {
      const maxInterruptionMs = {
        [DisplayedAvg.HR_1MIN]: 60 * 1000, // 1 minute
        [DisplayedAvg.HR_2MIN]: 2 * 60 * 1000, // 2 minutes
        [DisplayedAvg.HR_5MIN]: 5 * 60 * 1000, // 5 minutes
      }[displayedAvg];

      // Add null between points that are more than `maxInterruptionMs` apart
      const sanitizedAvgHR = displayedAvgHR.reduce<
        {timestamp: number; hr: number | null}[]
      >((acc, p) => {
        if (
          acc.length === 0 ||
          p.timestampMs - acc[acc.length - 1].timestamp > maxInterruptionMs
        ) {
          acc.push({timestamp: p.timestampMs, hr: null});
        }
        acc.push({
          timestamp: p.timestampMs,
          hr: USE_LOG_SCALE ? Math.log10(p.heartRate) : p.heartRate,
        });
        return acc;
      }, []);

      return sanitizedAvgHR;
    }, [displayedAvgHR, rhr24h]);

    if (!font) return null;

    console.log(minHR);

    return (
      <View style={[styles.container]}>
        <CartesianChart
          data={combined}
          xKey="timestamp"
          yKeys={['hr']}
          domain={{
            x: [chunkStartMs, chunkEndMs],
            y: USE_LOG_SCALE
              ? [Math.log10(minHR), Math.log10(maxHR + 10)]
              : [minHR, maxHR + 1],
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
              axisSide: 'right',
              font,
              labelPosition: 'inset',
            },
          ]}>
          {({points, chartBounds}) => (
            <>
              {/* <Area points={points.hr} y0={chartBounds.bottom} color="red">

              </Area> */}
              <Line points={points.hr} color="#fe2c55" strokeWidth={2}>
                <LinearGradient
                  start={vec(
                    0,
                    chartBounds.bottom +
                      (chartBounds.top - chartBounds.bottom) * 0.2,
                  )}
                  end={vec(
                    0,
                    chartBounds.top -
                      (chartBounds.top - chartBounds.bottom) * 0.1,
                  )}
                  colors={[
                    '#42A5F5',
                    '#42A5F5',
                    '#00C853', // green
                    '#40C463',
                    '#80BF5E',
                    '#B0B74D',
                    '#D6AE3E',
                    '#F9A825', // orange
                    '#F57C00',
                    '#EF6C00',
                    '#E53935', // red-orange
                    '#D32F2F', // red
                  ]}
                />
              </Line>
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

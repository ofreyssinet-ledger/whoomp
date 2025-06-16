import {count} from 'drizzle-orm';
import {useLiveQuery} from 'drizzle-orm/expo-sqlite';
import * as schema from '../db/schema';
import {useDrizzleDB} from './useDrizzleDB';

export function useDataCounts() {
  const drizzleDb = useDrizzleDB();

  const {data: historicalCounts} = useLiveQuery(
    drizzleDb.select({count: count()}).from(schema.historicalDataPoints),
  );
  const historicalDataPointsCount = historicalCounts?.[0]?.count ?? 0;

  const {data: hrAvg1minCounts} = useLiveQuery(
    drizzleDb.select({count: count()}).from(schema.heartRateAverage1min),
  );

  const hrAvg1minCount = hrAvg1minCounts?.[0]?.count ?? 0;

  const {data: hrAvg2minCounts} = useLiveQuery(
    drizzleDb.select({count: count()}).from(schema.heartRateAverage2min),
  );
  const hrAvg2minCount = hrAvg2minCounts?.[0]?.count ?? 0;

  const {data: hrAvg5minCounts} = useLiveQuery(
    drizzleDb.select({count: count()}).from(schema.heartRateAverage5min),
  );
  const hrAvg5minCount = hrAvg5minCounts?.[0]?.count ?? 0;

  const {data: restingHR24hCounts} = useLiveQuery(
    drizzleDb.select({count: count()}).from(schema.restingHeartRate24h),
  );
  const restingHR24hCount = restingHR24hCounts?.[0]?.count ?? 0;

  return {
    historicalDataPointsCount,
    hrAvg1minCount,
    hrAvg2minCount,
    hrAvg5minCount,
    restingHR24hCount,
  };
}

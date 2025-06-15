import {
  deserializeHistoricalDataDump,
  filterDataDumpStorageKeys,
  generateDataDumpStorageKey,
  HistoricalDataDump,
  serializeHistoricalDataDump,
  Storage,
} from '@whoomp/sdk';
import {drizzle} from 'drizzle-orm/expo-sqlite';
import {SQLiteDatabase} from 'expo-sqlite';
import * as schema from '../db/schema';
const {
  heartRateAverage2min,
  heartRateAverage5min,
  heartRateAverage1min,
  restingHeartRate24h,
} = schema;

import {and, asc, desc, eq, gte, lte} from 'drizzle-orm';
import {MMKV} from 'react-native-mmkv';

export const storage = new MMKV();

export function mobileStorage(sqliteDB: SQLiteDatabase): Storage {
  const drizzleDb = drizzle(sqliteDB, {schema});

  return {
    saveHistoricalDataDump: async historicalDataDump => {
      const {deviceName, date, dataDump} = historicalDataDump;
      console.log(
        `[mmkvStorage][saveHistoricalDataDump] Saving historical data dump`,
        historicalDataDump,
      );
      const key = generateDataDumpStorageKey(deviceName, date);
      const serializedData = serializeHistoricalDataDump(
        deviceName,
        date,
        dataDump,
      );
      console.log(
        `[mmkvStorage][saveHistoricalDataDump] Data serialized for key:`,
        key,
      );
      storage.set(key, serializedData);
      console.log(
        `[mmkvStorage][saveHistoricalDataDump] Saved historical data dump for ${deviceName} on ${date}`,
      );
    },

    getHistoricalDataDumps: async (deviceName, fromDate, toDate) => {
      const allKeys = storage.getAllKeys();
      const keys = filterDataDumpStorageKeys(
        allKeys,
        deviceName,
        fromDate,
        toDate,
      );
      const dumps: Array<HistoricalDataDump> = [];

      for (const key of keys) {
        const serializedData = storage.getString(key);
        if (serializedData) {
          try {
            const dump = deserializeHistoricalDataDump(serializedData);
            dumps.push(dump);
          } catch (error) {
            console.error(
              `Error deserializing data dump for key ${key}:`,
              error,
            );
          }
        } else {
          console.warn(`No data found for key ${key}`);
        }
      }

      return dumps;
    },

    deleteHistoricalDataDumpsInRange: async (deviceName, fromDate, toDate) => {
      const allKeys = storage.getAllKeys();
      const keys = filterDataDumpStorageKeys(
        allKeys,
        deviceName,
        fromDate,
        toDate,
      );

      for (const key of keys) {
        storage.delete(key);
        console.log(`Deleted historical data dump for key ${key}`);
      }
    },

    deleteHistoricalDataDump: async historicalDataDump => {
      const {deviceName, date} = historicalDataDump;
      const key = generateDataDumpStorageKey(deviceName, date);
      storage.delete(key);
      console.log(
        `[mmkvStorage][deleteHistoricalDataDump] Deleted historical data dump for ${deviceName} on ${date}`,
      );
    },

    saveHeartRateAverage1min: async data => {
      console.log(
        `[mmkvStorage][saveHeartRateAverage1min] Saving 1min heart rate averages`,
      );
      drizzleDb.insert(heartRateAverage1min).values(
        data.map(item => ({
          timestampMs: item.date.getTime(),
          heartRate: item.heartRate,
          deviceName: item.deviceName,
        })),
      );
    },

    getHeartRateAverage1min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[mmkvStorage][getHeartRateAverage1min] Fetching 1min heart rate averages`,
      );
      const query = await drizzleDb
        .select()
        .from(heartRateAverage1min)
        .where(
          and(
            deviceName
              ? eq(heartRateAverage1min.deviceName, deviceName)
              : undefined,
            fromDate
              ? gte(heartRateAverage1min.timestampMs, fromDate.getTime())
              : undefined,
            toDate
              ? lte(heartRateAverage1min.timestampMs, toDate.getTime())
              : undefined,
          ),
        );
      return query.map(item => ({
        date: new Date(item.timestampMs),
        heartRate: item.heartRate,
        deviceName: item.deviceName,
      }));
    },

    saveHeartRateAverage2min: async data => {
      console.log(
        `[mmkvStorage][saveHeartRateAverage2min] Saving 2min heart rate averages`,
      );
      drizzleDb.insert(heartRateAverage2min).values(
        data.map(item => ({
          timestampMs: item.date.getTime(),
          heartRate: item.heartRate,
          deviceName: item.deviceName,
        })),
      );
    },

    getHeartRateAverage2min(deviceName, fromDate, toDate) {
      console.log(
        `[mmkvStorage][getHeartRateAverage2min] Fetching 2min heart rate averages`,
      );
      return drizzleDb
        .select()
        .from(heartRateAverage2min)
        .where(
          and(
            deviceName
              ? eq(heartRateAverage2min.deviceName, deviceName)
              : undefined,
            fromDate
              ? gte(heartRateAverage2min.timestampMs, fromDate.getTime())
              : undefined,
            toDate
              ? lte(heartRateAverage2min.timestampMs, toDate.getTime())
              : undefined,
          ),
        )
        .then(query =>
          query.map(item => ({
            date: new Date(item.timestampMs),
            heartRate: item.heartRate,
            deviceName: item.deviceName,
          })),
        );
    },

    saveHeartRateAverage5min: async data => {
      console.log(
        `[mmkvStorage][saveHeartRateAverage5min] Saving 5min heart rate averages`,
      );
      drizzleDb.insert(heartRateAverage5min).values(
        data.map(item => ({
          timestampMs: item.date.getTime(),
          heartRate: item.heartRate,
          deviceName: item.deviceName,
        })),
      );
    },

    getHeartRateAverage5min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[mmkvStorage][getHeartRateAverage5min] Fetching 5min heart rate averages`,
      );
      const query = await drizzleDb
        .select()
        .from(heartRateAverage5min)
        .where(
          and(
            deviceName
              ? eq(heartRateAverage5min.deviceName, deviceName)
              : undefined,
            fromDate
              ? gte(heartRateAverage5min.timestampMs, fromDate.getTime())
              : undefined,
            toDate
              ? lte(heartRateAverage5min.timestampMs, toDate.getTime())
              : undefined,
          ),
        );
      return query.map(item => ({
        date: new Date(item.timestampMs),
        heartRate: item.heartRate,
        deviceName: item.deviceName,
      }));
    },

    saveRestingHeartRate24h: async data => {
      console.log(
        `[mmkvStorage][saveRestingHeartRate24h] Saving 24h resting heart rate`,
      );
      drizzleDb.insert(restingHeartRate24h).values(
        data.map(item => ({
          timestampMs: item.date.getTime(),
          heartRate: item.heartRate,
          deviceName: item.deviceName,
        })),
      );
    },

    getRestingHeartRate24h: async (deviceName, fromDate, toDate) => {
      console.log(
        `[mmkvStorage][getRestingHeartRate24h] Fetching 24h resting heart rate`,
      );
      const query = await drizzleDb
        .select()
        .from(restingHeartRate24h)
        .where(
          and(
            deviceName
              ? eq(restingHeartRate24h.deviceName, deviceName)
              : undefined,
            fromDate
              ? gte(restingHeartRate24h.timestampMs, fromDate.getTime())
              : undefined,
            toDate
              ? lte(restingHeartRate24h.timestampMs, toDate.getTime())
              : undefined,
          ),
        );
      return query.map(item => ({
        date: new Date(item.timestampMs),
        heartRate: item.heartRate,
        deviceName: item.deviceName,
      }));
    },

    saveKnownDevice: async (deviceId, deviceName, lastConnectedMs) => {
      console.log(
        `[mmkvStorage][saveKnownDevice] Saving known device ${deviceId}`,
      );
      await drizzleDb.insert(schema.knownDevices).values({
        id: deviceId,
        deviceName,
        lastConnectedMs,
      });
    },

    getKnownDevices: async () => {
      console.log(`[mmkvStorage][getKnownDevices] Fetching known devices`);
      const query = await drizzleDb
        .select()
        .from(schema.knownDevices)
        .orderBy(asc(schema.knownDevices.lastConnectedMs));
      return query.map(item => ({
        deviceId: item.id,
        deviceName: item.deviceName,
        lastConnectedMs: item.lastConnectedMs,
      }));
    },

    getLastConnectedDevice: async () => {
      console.log(
        `[mmkvStorage][getLastConnectedDevice] Fetching last connected device`,
      );
      const query = await drizzleDb
        .select()
        .from(schema.knownDevices)
        .orderBy(desc(schema.knownDevices.lastConnectedMs))
        .limit(1);
      if (query.length === 0) {
        return null;
      }
      const item = query[0];
      return {
        deviceId: item.id,
        deviceName: item.deviceName,
        lastConnectedMs: item.lastConnectedMs,
      };
    },

    deleteKnownDevice: async deviceId => {
      console.log(
        `[mmkvStorage][deleteKnownDevice] Deleting known device ${deviceId}`,
      );
      await drizzleDb
        .delete(schema.knownDevices)
        .where(eq(schema.knownDevices.id, deviceId));
    },

    deleteKnownDevices: async () => {
      console.log(
        `[mmkvStorage][deleteKnownDevices] Deleting all known devices`,
      );
      await drizzleDb.delete(schema.knownDevices);
    },
  } satisfies Storage;
}

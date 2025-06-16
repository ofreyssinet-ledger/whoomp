import {Storage} from '@whoomp/sdk';
import {drizzle} from 'drizzle-orm/expo-sqlite';
import {SQLiteDatabase} from 'expo-sqlite';
import * as schema from '../db/schema';
const {
  heartRateAverage2min,
  heartRateAverage5min,
  heartRateAverage1min,
  restingHeartRate24h,
} = schema;

import {and, asc, desc, eq, gte, lte, SQLWrapper} from 'drizzle-orm';
import {MMKV} from 'react-native-mmkv';

const MAX_VARS = 32766;

function filterDateAndDeviceNameForSchema(args: {
  schema: {timestampMs: SQLWrapper; deviceName: SQLWrapper};
  fromDate?: Date;
  toDate?: Date;
  deviceName?: string;
}) {
  const {schema, fromDate, toDate, deviceName} = args;
  return and(
    deviceName ? eq(schema.deviceName, deviceName) : undefined,
    fromDate ? gte(schema.timestampMs, fromDate.getTime()) : undefined,
    toDate ? lte(schema.timestampMs, toDate.getTime()) : undefined,
  );
}

export function mobileStorage(sqliteDB: SQLiteDatabase): Storage {
  const drizzleDb = drizzle(sqliteDB, {schema});

  function listTables() {
    sqliteDB
      .getAllAsync(`SELECT name FROM sqlite_master WHERE type='table';`)
      .then(result => {
        console.log(
          `[MobileStorage] Available tables in the database:`,
          result,
        );
      })
      .catch(error => {
        console.error(`[MobileStorage] Error fetching table names:`, error);
      });
  }
  function getMaxVars() {
    sqliteDB
      .getAllAsync(`PRAGMA compile_options;`)
      .then(result => {
        console.log(
          `[MobileStorage] compile options for the database:`,
          result,
        );
      })
      .catch(error => {
        console.error(
          `[MobileStorage] Error fetching max variable number:`,
          error,
        );
      });
  }
  listTables();
  getMaxVars();

  return {
    saveHistoricalDataPackets: async (deviceName, historicalDataPackets) => {
      console.log(
        `[MobileStorage][saveHistoricalDataPackets] Saving historical data packets`,
      );

      const COLS_PER_ROW = 5; // deviceName, timestampMs, heartRate, rr, unknown
      const maxRowsPerBatch = Math.floor(MAX_VARS / COLS_PER_ROW);

      for (let i = 0; i < historicalDataPackets.length; i += maxRowsPerBatch) {
        const batch = historicalDataPackets.slice(i, i + maxRowsPerBatch);
        drizzleDb
          .insert(schema.historicalDataPoints)
          .values(
            batch.map(packet => ({
              ...packet,
              deviceName: deviceName,
            })),
          )
          .onConflictDoNothing()
          .catch(error => {
            console.error(
              `[MobileStorage][saveHistoricalDataPackets] Error saving historical data packets:`,
              error,
            );
          });
      }
    },

    getHistoricalDataDumpNew(deviceName, fromDate, toDate) {
      console.log(
        `[MobileStorage][getHistoricalDataDumpNew] Fetching historical data dumps`,
      );
      return drizzleDb
        .select()
        .from(schema.historicalDataPoints)
        .where(
          filterDateAndDeviceNameForSchema({
            schema: schema.historicalDataPoints,
            fromDate,
            toDate,
            deviceName,
          }),
        )
        .orderBy(asc(schema.historicalDataPoints.timestampMs));
    },

    saveHeartRateAverage1min: async data => {
      console.log(
        `[MobileStorage][saveHeartRateAverage1min] Saving 1min heart rate averages (${data.length} records)`,
      );
      const COLS_PER_ROW = 3; // timestampMs, heartRate, deviceName
      const maxRowsPerBatch = Math.floor(MAX_VARS / COLS_PER_ROW);

      for (let i = 0; i < data.length; i += maxRowsPerBatch) {
        const batch = data.slice(i, i + maxRowsPerBatch);
        console.log(
          `[MobileStorage][saveHeartRateAverage1min] Saving batch of ${batch.length} 1min heart rate averages`,
        );
        drizzleDb
          .insert(heartRateAverage1min)
          .values(
            batch.map(item => ({
              timestampMs: item.timestampMs,
              heartRate: item.heartRate,
              deviceName: item.deviceName,
            })),
          )
          .onConflictDoNothing()
          .catch(error => {
            console.error(
              `[MobileStorage][saveHeartRateAverage1min] Error saving 1min heart rate averages:`,
              error,
            );
          });
      }
    },

    getHeartRateAverage1min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][getHeartRateAverage1min] Fetching 1min heart rate averages`,
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
        )
        .orderBy(asc(heartRateAverage1min.timestampMs));
      return query;
    },

    deleteHeartRateAverage1min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][deleteHeartRateAverage1min] Deleting 1min heart rate averages`,
      );
      await drizzleDb.delete(heartRateAverage1min).where(
        filterDateAndDeviceNameForSchema({
          schema: heartRateAverage1min,
          fromDate,
          toDate,
          deviceName,
        }),
      );
    },

    saveHeartRateAverage2min: async data => {
      console.log(
        `[MobileStorage][saveHeartRateAverage2min] Saving 2min heart rate averages (${data.length} records)`,
      );

      // Insert data in batches to avoid exceeding max variable limit
      const COLS_PER_ROW = 3; // timestampMs, heartRate, deviceName
      const maxRowsPerBatch = Math.floor(MAX_VARS / COLS_PER_ROW);
      for (let i = 0; i < data.length; i += maxRowsPerBatch) {
        const batch = data.slice(i, i + maxRowsPerBatch);
        console.log(
          `[MobileStorage][saveHeartRateAverage2min] Saving batch of ${batch.length} 2min heart rate averages`,
        );
        // Insert the batch into the database
        drizzleDb
          .insert(heartRateAverage2min)
          .values(
            batch.map(item => ({
              timestampMs: item.timestampMs,
              heartRate: item.heartRate,
              deviceName: item.deviceName,
            })),
          )
          .onConflictDoNothing()
          .catch(error => {
            console.error(
              `[MobileStorage][saveHeartRateAverage2min] Error saving 2min heart rate averages:`,
              error,
            );
          });
      }
    },

    getHeartRateAverage2min(deviceName, fromDate, toDate) {
      console.log(
        `[MobileStorage][getHeartRateAverage2min] Fetching 2min heart rate averages`,
      );
      return drizzleDb
        .select()
        .from(heartRateAverage2min)
        .where(
          filterDateAndDeviceNameForSchema({
            schema: heartRateAverage2min,
            fromDate,
            toDate,
            deviceName,
          }),
        )
        .orderBy(asc(heartRateAverage2min.timestampMs));
    },

    deleteHeartRateAverage2min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][deleteHeartRateAverage2min] Deleting 2min heart rate averages`,
      );
      await drizzleDb.delete(heartRateAverage2min).where(
        filterDateAndDeviceNameForSchema({
          schema: heartRateAverage2min,
          fromDate,
          toDate,
          deviceName,
        }),
      );
    },

    saveHeartRateAverage5min: async data => {
      console.log(
        `[MobileStorage][saveHeartRateAverage5min] Saving 5min heart rate averages (${data.length} records)`,
      );
      // Insert data in batches to avoid exceeding max variable limit
      const COLS_PER_ROW = 3; // timestampMs, heartRate, deviceName
      const maxRowsPerBatch = Math.floor(MAX_VARS / COLS_PER_ROW);
      for (let i = 0; i < data.length; i += maxRowsPerBatch) {
        const batch = data.slice(i, i + maxRowsPerBatch);
        console.log(
          `[MobileStorage][saveHeartRateAverage5min] Saving batch of ${batch.length} 5min heart rate averages`,
        );
        // Insert the batch into the database
        drizzleDb
          .insert(heartRateAverage5min)
          .values(batch)
          .onConflictDoNothing()
          .catch(error => {
            console.error(
              `[MobileStorage][saveHeartRateAverage5min] Error saving 5min heart rate averages:`,
              error,
            );
          });
      }
    },

    getHeartRateAverage5min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][getHeartRateAverage5min] Fetching 5min heart rate averages`,
      );
      const query = await drizzleDb
        .select()
        .from(heartRateAverage5min)
        .where(
          filterDateAndDeviceNameForSchema({
            schema: heartRateAverage5min,
            fromDate,
            toDate,
            deviceName,
          }),
        )
        .orderBy(asc(heartRateAverage5min.timestampMs));
      return query;
    },

    deleteHeartRateAverage5min: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][deleteHeartRateAverage5min] Deleting 5min heart rate averages`,
      );
      await drizzleDb.delete(heartRateAverage5min).where(
        filterDateAndDeviceNameForSchema({
          schema: heartRateAverage5min,
          fromDate,
          toDate,
          deviceName,
        }),
      );
    },

    saveRestingHeartRate24h: async data => {
      console.log(
        `[MobileStorage][saveRestingHeartRate24h] Saving 24h resting heart rate (${data.length} records)`,
      );

      // Insert data in batches to avoid exceeding max variable limit
      const COLS_PER_ROW = 4; // timestampMs, heartRate, deviceName
      const maxRowsPerBatch = Math.floor(MAX_VARS / COLS_PER_ROW);
      for (let i = 0; i < data.length; i += maxRowsPerBatch) {
        const batch = data.slice(i, i + maxRowsPerBatch);
        console.log(
          `[MobileStorage][saveRestingHeartRate24h] Saving batch of ${batch.length} 24h resting heart rate`,
        );
        // Insert the batch into the database
        drizzleDb
          .insert(restingHeartRate24h)
          .values(batch)
          .onConflictDoNothing()
          .catch(error => {
            console.error(
              `[MobileStorage][saveRestingHeartRate24h] Error saving 24h resting heart rate:`,
              error,
            );
          });
      }
    },

    getRestingHeartRate24h: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][getRestingHeartRate24h] Fetching 24h resting heart rate`,
      );
      const query = await drizzleDb
        .select()
        .from(restingHeartRate24h)
        .where(
          filterDateAndDeviceNameForSchema({
            schema: restingHeartRate24h,
            fromDate,
            toDate,
            deviceName,
          }),
        )
        .orderBy(asc(restingHeartRate24h.timestampMs));
      return query;
    },

    deleteRestingHeartRate24h: async (deviceName, fromDate, toDate) => {
      console.log(
        `[MobileStorage][deleteRestingHeartRate24h] Deleting 24h resting heart rate`,
      );
      await drizzleDb.delete(restingHeartRate24h).where(
        filterDateAndDeviceNameForSchema({
          schema: restingHeartRate24h,
          fromDate,
          toDate,
          deviceName,
        }),
      );
    },

    saveKnownDevice: async (deviceId, deviceName, lastConnectedMs) => {
      console.log(
        `[MobileStorage][saveKnownDevice] Saving known device ${deviceId}`,
      );
      await drizzleDb.insert(schema.knownDevices).values({
        deviceId,
        deviceName,
        lastConnectedMs,
      });
    },

    getKnownDevices: async () => {
      console.log(`[MobileStorage][getKnownDevices] Fetching known devices`);
      const query = await drizzleDb
        .select()
        .from(schema.knownDevices)
        .orderBy(asc(schema.knownDevices.lastConnectedMs));
      return query;
    },

    getLastConnectedDevice: async () => {
      console.log(
        `[MobileStorage][getLastConnectedDevice] Fetching last connected device`,
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
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        lastConnectedMs: item.lastConnectedMs,
      };
    },

    deleteKnownDevice: async deviceId => {
      console.log(
        `[MobileStorage][deleteKnownDevice] Deleting known device ${deviceId}`,
      );
      await drizzleDb
        .delete(schema.knownDevices)
        .where(eq(schema.knownDevices.deviceId, deviceId));
    },

    deleteKnownDevices: async () => {
      console.log(
        `[MobileStorage][deleteKnownDevices] Deleting all known devices`,
      );
      await drizzleDb.delete(schema.knownDevices);
    },

    saveSyncStatus: async (deviceName, lastSyncedMs) => {
      console.log(
        `[MobileStorage][saveSyncStatus] Saving last sync for ${deviceName}`,
      );
      await drizzleDb
        .insert(schema.lastSync)
        .values({
          deviceName,
          lastSyncedMs,
        })
        .onConflictDoUpdate({
          target: schema.lastSync.deviceName,
          set: {
            lastSyncedMs,
          },
        });
    },

    getDeviceSyncStatus: async deviceName => {
      console.log(
        `[MobileStorage][getDeviceSyncStatus] Fetching sync status for ${deviceName}`,
      );
      return drizzleDb
        .select()
        .from(schema.lastSync)
        .where(eq(schema.lastSync.deviceName, deviceName))
        .then(query => {
          console.log(
            `[MobileStorage][getDeviceSyncStatus] Query result:`,
            query,
          );
          if (query.length === 0) {
            return null;
          }
          console.log(
            `[MobileStorage][getDeviceSyncStatus] Found sync status for ${deviceName}`,
          );
          const item = query[0];
          return {
            deviceName: item.deviceName,
            lastSyncedMs: item.lastSyncedMs,
          };
        });
    },

    deleteDeviceSyncStatus: async deviceName => {
      console.log(
        `[MobileStorage][deleteDeviceSyncStatus] Deleting sync status for ${deviceName}`,
      );
      await drizzleDb
        .delete(schema.lastSync)
        .where(eq(schema.lastSync.deviceName, deviceName));
    },
  } satisfies Storage;
}

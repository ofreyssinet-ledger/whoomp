import {primaryKey, sqliteTable, integer, text} from 'drizzle-orm/sqlite-core';

export const historicalDataPoints = sqliteTable(
  'historical_data_points',
  {
    timestampMs: integer('timestamp_ms').notNull(),
    heartRate: integer('heart_rate').notNull(),
    rr: text('rr', {mode: 'json'}).$type<number[]>(),
    deviceName: text('device_name', {length: 100}).notNull(),
    unknown: integer('unknown').notNull(),
  },
  table => [primaryKey({columns: [table.timestampMs, table.deviceName]})],
);

export const heartRateAverage1min = sqliteTable(
  'heart_rate_avg_1min',
  {
    timestampMs: integer('timestamp_ms').notNull(),
    heartRate: integer('heart_rate').notNull(),
    deviceName: text('device_name', {length: 100}).notNull(),
  },
  table => [primaryKey({columns: [table.timestampMs, table.deviceName]})],
);

export const heartRateAverage2min = sqliteTable(
  'heart_rate_avg_2min',
  {
    timestampMs: integer('timestamp_ms').notNull(),
    heartRate: integer('heart_rate').notNull(),
    deviceName: text('device_name', {length: 100}).notNull(),
  },
  table => [primaryKey({columns: [table.timestampMs, table.deviceName]})],
);

export const heartRateAverage5min = sqliteTable(
  'heart_rate_avg_5min',
  {
    timestampMs: integer('timestamp_ms').notNull(),
    heartRate: integer('heart_rate').notNull(),
    deviceName: text('device_name', {length: 100}).notNull(),
  },
  table => [primaryKey({columns: [table.timestampMs, table.deviceName]})],
);

export const restingHeartRate24h = sqliteTable(
  'resting_heart_rate_24h',
  {
    timestampMs: integer('timestamp_ms').notNull(),
    heartRate: integer('heart_rate').notNull(),
    deviceName: text('device_name', {length: 100}).notNull(),
  },
  table => [primaryKey({columns: [table.timestampMs, table.deviceName]})],
);

export const knownDevices = sqliteTable('known_device', {
  deviceId: text('device_id').primaryKey(),
  deviceName: text('device_name', {length: 100}).notNull(),
  lastConnectedMs: integer('last_connected_ms').notNull(),
});

export const lastSync = sqliteTable('last_sync', {
  deviceName: text('device_name', {length: 100}).primaryKey().notNull(),
  lastSyncedMs: integer('last_synced_ms').notNull(),
});

export type HistoricalDataPoints = typeof historicalDataPoints.$inferSelect;
export type HeartRateAverage1min = typeof heartRateAverage1min.$inferSelect;
export type HeartRateAverage2min = typeof heartRateAverage2min.$inferSelect;
export type HeartRateAverage5min = typeof heartRateAverage5min.$inferSelect;
export type RestingHeartRate24h = typeof restingHeartRate24h.$inferSelect;
export type KnownDevice = typeof knownDevices.$inferSelect;
export type LastSync = typeof lastSync.$inferSelect;

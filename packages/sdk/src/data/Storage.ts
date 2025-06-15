import { HistoricalDataDump, HistoricalDataPacket } from './model';

export interface Storage {
  /**
   *
   * HISTORICAL DATA DUMPS
   *
   */
  saveHistoricalDataDump(HistoricalDataDump: HistoricalDataDump): Promise<void>;

  saveHistoricalDataPackets(
    deviceName: string,
    historicalDataPackets: Array<HistoricalDataPacket>,
  ): Promise<void>;

  getHistoricalDataDumps(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<HistoricalDataDump>>;

  getHistoricalDataDumpNew(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<HistoricalDataPacket>>;

  deleteHistoricalDataDumpsInRange(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  deleteHistoricalDataDump(
    historicalDataDump: HistoricalDataDump,
  ): Promise<void>;

  /**
   *
   * ANALYSIS DATA
   *
   */

  /** HR 1Min moving average*/
  saveHeartRateAverage1min(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage1min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;
  deleteHeartRateAverage1min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /** HR 2Min moving average*/
  saveHeartRateAverage2min(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage2min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;
  deleteHeartRateAverage2min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /** HR 5Min moving average*/
  saveHeartRateAverage5min(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage5min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;
  deleteHeartRateAverage5min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /** Resting HR of last 24h */
  saveRestingHeartRate24h(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;
  getRestingHeartRate24h(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;
  deleteRestingHeartRate24h(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /**
   *
   * KNOWN DEVICES
   *
   */
  saveKnownDevice(
    deviceId: string,
    deviceName: string,
    lastConnectedMs: number,
  ): Promise<void>;

  getKnownDevices(): Promise<
    Array<{
      deviceId: string;
      deviceName: string;
      lastConnectedMs: number;
    }>
  >;

  getLastConnectedDevice(): Promise<{
    deviceId: string;
    deviceName: string;
    lastConnectedMs: number;
  } | null>;

  deleteKnownDevice(deviceId: string): Promise<void>;

  deleteKnownDevices(): Promise<void>;

  /**
   * SYNC STATUS
   */
  saveSyncStatus(deviceName: string, lastSyncedMs: number): Promise<void>;

  getDeviceSyncStatus(deviceName: string): Promise<{
    deviceName: string;
    lastSyncedMs: number;
  } | null>;

  deleteDeviceSyncStatus(deviceName: string): Promise<void>;
}

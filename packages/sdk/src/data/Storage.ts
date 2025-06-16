import {
  AverageHRDataPoint,
  HistoricalDataPacket,
  RHRDataPoint,
} from './model';

export interface Storage {
  /**
   *
   * HISTORICAL DATA DUMPS
   *
   */

  saveHistoricalDataPackets(
    deviceName: string,
    historicalDataPackets: Array<HistoricalDataPacket>,
  ): Promise<void>;

  getHistoricalDataDumpNew(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<HistoricalDataPacket>>;

  /**
   *
   * ANALYSIS DATA
   *
   */

  /** HR 1Min moving average*/
  saveHeartRateAverage1min(
    data: Array<AverageHRDataPoint & { deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage1min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<AverageHRDataPoint>>;
  deleteHeartRateAverage1min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /** HR 2Min moving average*/
  saveHeartRateAverage2min(
    data: Array<AverageHRDataPoint & { deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage2min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<AverageHRDataPoint>>;
  deleteHeartRateAverage2min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /** HR 5Min moving average*/
  saveHeartRateAverage5min(
    data: Array<AverageHRDataPoint & { deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage5min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<AverageHRDataPoint>>;
  deleteHeartRateAverage5min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<void>;

  /** Resting HR of last 24h */
  saveRestingHeartRate24h(
    data: Array<RHRDataPoint & { deviceName: string }>,
  ): Promise<void>;
  getRestingHeartRate24h(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<RHRDataPoint & { deviceName: string }>>;
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

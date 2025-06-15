import { HistoricalDataDump } from './model';

export interface Storage {
  /**
   *
   * HISTORICAL DATA DUMPS
   *
   */
  saveHistoricalDataDump(HistoricalDataDump: HistoricalDataDump): Promise<void>;

  getHistoricalDataDumps(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<HistoricalDataDump>>;

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

  /** HR 2Min moving average*/
  saveHeartRateAverage2min(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage2min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;

  /** HR 5Min moving average*/
  saveHeartRateAverage5min(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;
  getHeartRateAverage5min(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;

  /** Resting HR of last 24h */
  saveRestingHeartRate24h(
    data: Array<{ date: Date; heartRate: number; deviceName: string }>,
  ): Promise<void>;

  getRestingHeartRate24h(
    deviceName?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Array<{ date: Date; heartRate: number }>>;

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
}

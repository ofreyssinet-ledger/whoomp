import { HistoricalDataDump } from './model';

export interface Storage {
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
}

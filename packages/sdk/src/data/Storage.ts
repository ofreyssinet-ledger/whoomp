import { HistoricalDataPacket } from './model';

export interface Storage {
  saveParsedHistoricalData(
    data: Record<string, HistoricalDataPacket>,
  ): Promise<void>;
}

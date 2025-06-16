import { HistoricalDataPacket, HistoricalDataDump } from './model';

export function makeHistoricalDataDump(
  deviceName: string,
  dataDump: Array<HistoricalDataPacket>,
): HistoricalDataDump {
  const lastPacket = dataDump[dataDump.length - 1];
  const date = new Date(lastPacket.timestampMs);
  return {
    deviceName,
    date,
    dataDump,
  };
}

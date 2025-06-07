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

export function mergeHistoricalDataDumps(
  dumps: Array<HistoricalDataDump>,
): HistoricalDataDump {
  if (dumps.length === 0) {
    throw new Error('Cannot merge empty array of HistoricalDataDumps');
  }

  const sortedDumps = dumps.sort((a, b) => a.date.getTime() - b.date.getTime());

  const deviceName = sortedDumps[0].deviceName;
  const date = sortedDumps[sortedDumps.length - 1].date; // Use the last date
  const dataDump = sortedDumps.flatMap((dump) => dump.dataDump);

  return {
    deviceName,
    date,
    dataDump,
  };
}

export function filterHistoricalDataPacket(
  packet: HistoricalDataPacket,
  fromDate?: Date,
  toDate?: Date,
): boolean {
  if (fromDate && packet.timestampMs < fromDate.getTime()) {
    return false;
  }
  if (toDate && packet.timestampMs > toDate.getTime()) {
    return false;
  }
  return true;
}

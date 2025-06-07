export type HistoricalDataPacket = {
  /** Timestamp in milliseconds since epoch */
  timestampMs: number;
  /** Unknown field, needs further investigation */
  unknown: number;
  /** Heart rate in bpm */
  heartRate: number;
  /** Array of RR intervals in milliseconds */
  rr: number[];
  /** Optional, original data for reference */
  originalData: Uint8Array;
};

export type HistoricalDataDump = {
  deviceName: string;
  date: Date;
  dataDump: Array<HistoricalDataPacket>;
};

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

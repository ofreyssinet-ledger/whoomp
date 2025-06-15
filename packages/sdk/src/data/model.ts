export type HistoricalDataPacket = {
  /** Timestamp in milliseconds since epoch */
  timestampMs: number;
  /** Heart rate in bpm */
  heartRate: number;
  /** Array of RR intervals in milliseconds */
  rr: number[];
  /** Unknown field, needs further investigation */
  unknown: number;
};

export type HistoricalDataDump = {
  deviceName: string;
  date: Date;
  dataDump: Array<HistoricalDataPacket>;
};

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

export type AverageHRDataPoint = { timestampMs: number; heartRate: number };
export type AverageHRDataSet = Array<AverageHRDataPoint>;

export type RHRDataPoint = AverageHRDataPoint & { measuredAtMs: number };
export type RHRDataSet = Array<RHRDataPoint>;

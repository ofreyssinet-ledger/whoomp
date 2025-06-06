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

import { AverageHRDataSet, RHRDataSet } from '../data/model';

type RawData = Array<{ timestampMs: number; heartRate: number }>;

export type AnalysedDataResult = {
  /**
   * Heart rate averaged over 1-minute windows.
   */
  hrAvg1min: AverageHRDataSet;
  /**
   * Heart rate averaged over 2-minute windows.
   */
  hrAvg2min: AverageHRDataSet;
  /**
   * Heart rate averaged over 5-minute windows.
   */
  hrAvg5min: AverageHRDataSet;
  /**
   * Resting heart rate averaged over 24-hour windows.
   * Each point represents the minimum heart rate observed in that 24-hour period.
   * It is computed from the 5-minute averages.
   */
  rhr24h: RHRDataSet;
};

const MIN_VALID_HEART_RATE = 10;
const MAX_VALID_HEART_RATE = 250;

export function analyseData(rawData: RawData): AnalysedDataResult {
  const MS_1MIN = 60 * 1000;
  const MS_2MIN = 2 * 60 * 1000;
  const MS_5MIN = 5 * 60 * 1000;
  const MS_24H = 24 * 60 * 60 * 1000;

  if (rawData.length === 0) {
    return { hrAvg1min: [], hrAvg2min: [], hrAvg5min: [], rhr24h: [] };
  }

  const data = rawData
    .filter(
      (p) =>
        p.heartRate > MIN_VALID_HEART_RATE &&
        p.heartRate < MAX_VALID_HEART_RATE,
    )
    .slice()
    .sort((a, b) => a.timestampMs - b.timestampMs);
  const times = data.map((p) => p.timestampMs);
  const rates = data.map((p) => p.heartRate);

  /**
   * Find the index of the first element in `arr` that is not less than `target`.
   */
  function lowerBound(arr: number[], target: number): number {
    let lo = 0,
      hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Find the index of the first element in `arr` that is greater than `target`.
   */
  function upperBound(arr: number[], target: number): number {
    let lo = 0,
      hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function computeMovingAverage(
    windowMs: number,
    sampleMs: number,
  ): AverageHRDataSet {
    const result: AverageHRDataSet = [];
    const startTs = Math.ceil(times[0] / sampleMs) * sampleMs;
    const endTs = times[times.length - 1];
    for (let t = startTs; t <= endTs; t += sampleMs) {
      const wStart = t - windowMs;
      const i0 = lowerBound(times, wStart);
      const i1 = upperBound(times, t) - 1;
      if (i0 <= i1) {
        let sum = 0;
        for (let i = i0; i <= i1; i++) sum += rates[i];
        result.push({ timestampMs: t, heartRate: sum / (i1 - i0 + 1) });
      }
    }
    return result;
  }

  const hrAvg1min = computeMovingAverage(MS_1MIN, MS_1MIN);
  const hrAvg2min = computeMovingAverage(MS_2MIN, MS_1MIN);
  const hrAvg5min = computeMovingAverage(MS_5MIN, MS_1MIN);

  function computeMinOverWindow(
    src: AverageHRDataSet,
    windowMs: number,
    sampleMs: number,
  ): RHRDataSet {
    if (src.length === 0) return [];
    const timestamps = src.map((p) => p.timestampMs);
    const heartRates = src.map((p) => p.heartRate);
    const res: RHRDataSet = [];

    // We only want to compute the 24h RHR if we have at least 24h of data.
    const startTimestamp = timestamps[0] + MS_24H;

    const start = Math.ceil(startTimestamp / sampleMs) * sampleMs;
    const end = timestamps[timestamps.length - 1];
    for (let t = start; t <= end; t += sampleMs) {
      const wStart = t - windowMs;
      const startIndex = lowerBound(timestamps, wStart);
      const endIndex = upperBound(timestamps, t) - 1;
      if (startIndex <= endIndex) {
        let min = Infinity; // m is the minimum heart rate in the window
        let measuredAtMs: number | null = null;
        for (let i = startIndex; i <= endIndex; i++) {
          if (heartRates[i] < min) {
            min = heartRates[i];
            measuredAtMs = timestamps[i];
          }
        }
        if (measuredAtMs !== null) {
          res.push({ timestampMs: t, heartRate: min, measuredAtMs });
        }
      }
    }
    return res;
  }

  const rhr24h = computeMinOverWindow(hrAvg5min, MS_24H, MS_5MIN);

  return { hrAvg1min, hrAvg2min, hrAvg5min, rhr24h };
}

import {AverageHRDataSet, RHRDataSet} from '@whoomp/sdk';

export type DayData = {
  chunkStartMs: number;
  chunkEndMs: number;
  hrAvg1min: AverageHRDataSet;
  hrAvg2min: AverageHRDataSet;
  hrAvg5min: AverageHRDataSet;
  rhr24h: RHRDataSet;
};

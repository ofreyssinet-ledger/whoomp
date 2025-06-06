import { bufferCount, Observable, tap } from 'rxjs';
import { HistoricalDataDump, HistoricalDataPacket } from '../../data/model';

export function downloadHistoricalData(
  deviceId: string,
  deviceName: string,
  date: Date,
  dataStream: Observable<HistoricalDataPacket>,
  saveHistoricalDataDump: (dump: HistoricalDataDump) => Promise<void>,
  bufferSize: number = 36000, // Default to 10 hours of data at 1s intervals
): Promise<HistoricalDataDump> {
  let resolvePromise: (value: HistoricalDataDump) => void;
  let rejectPromise: (reason?: any) => void;
  const promise = new Promise<HistoricalDataDump>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const dataDump: Array<HistoricalDataPacket> = [];

  dataStream
    .pipe(
      tap((packet) => {
        dataDump.push(packet);
      }),
      bufferCount(bufferSize),
    )
    .subscribe({
      next: (packets) => {
        console.log(
          'SDK: Buffered packets for deviceId, saving them',
          deviceId,
          packets.length,
        );
        const lastPacket = packets[packets.length - 1];
        const lastPacketTime = new Date(lastPacket.timestampMs);
        const historicalDataDump: HistoricalDataDump = {
          deviceName,
          date: new Date(lastPacketTime),
          dataDump: packets,
        };
        saveHistoricalDataDump(historicalDataDump);
      },
      complete: () => {
        console.log(
          'SDK: Historical data download completed for deviceId',
          deviceId,
        );
        resolvePromise({
          deviceName,
          date,
          dataDump,
        });
      },
      error: (err) => {
        console.error(
          'SDK: Error downloading historical data for deviceId',
          deviceId,
          err,
        );
        rejectPromise(err);
      },
    });

  return promise;
}

import { bufferCount, Observable, tap } from 'rxjs';
import {
  HistoricalDataDump,
  HistoricalDataPacket,
  makeHistoricalDataDump,
} from '../../data/model';

// async function defragmentSavedDumps(): Promise<HistoricalDataDump> {
//   console.log(
//     '[downloadHistoricalData] Defragmenting saved data dumps for deviceId',
//     deviceId,
//     savedDataDumps.length,
//   );
//   const fullDump = makeHistoricalDataDump(
//     deviceName,
//     savedDataDumps.flatMap((dump) => dump.dataDump),
//   );
//   // TODO: add an id for each data dump so we can first save the new one
//   // and then delete the old ones. not possible now because the last of
//   // the saved dumps has the same storage key as the full dump.
//   await Promise.all(
//     savedDataDumps.map((dump) => {
//       deleteHistoricalDataDump(dump).catch((err) => {
//         console.error(
//           '[downloadHistoricalData] Error deleting historical data dump',
//           dump.deviceName,
//           dump.date,
//           err,
//         );
//       });
//     }),
//   );
//   console.log(
//     '[downloadHistoricalData] Saving full data dump for deviceId',
//     deviceId,
//   );
//   await saveHistoricalDataDump(fullDump);
//   console.log(
//     '[downloadHistoricalData] Full data dump saved for deviceId',
//     deviceId,
//   );
//   return fullDump;
// }

export function downloadHistoricalData(
  deviceId: string,
  deviceName: string,
  dataStream: Observable<HistoricalDataPacket>,
  saveHistoricalDataDump: (dump: HistoricalDataDump) => Promise<void>,
  bufferSize: number = 36000, // Default to 10 hours of data at 1s intervals
): Promise<Array<HistoricalDataDump>> {
  let resolvePromise: (value: Array<HistoricalDataDump>) => void;
  let rejectPromise: (reason?: any) => void;
  const promise = new Promise<Array<HistoricalDataDump>>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const savedDataDumps: Array<HistoricalDataDump> = [];

  dataStream.pipe(bufferCount(bufferSize)).subscribe({
    next: (packets) => {
      console.log(
        '[downloadHistoricalData] Buffered packets for deviceId, saving them',
        deviceId,
        packets.length,
      );
      const historicalDataDump = makeHistoricalDataDump(deviceName, packets);
      saveHistoricalDataDump(historicalDataDump);
      savedDataDumps.push(historicalDataDump);
    },
    complete: () => {
      console.log(
        '[downloadHistoricalData] Historical data download completed for deviceId',
        deviceId,
      );
      resolvePromise(savedDataDumps);
    },
    error: (err) => {
      console.error(
        '[downloadHistoricalData] Error downloading historical data for deviceId',
        deviceId,
        err,
      );
      rejectPromise(err);
    },
  });

  return promise;
}

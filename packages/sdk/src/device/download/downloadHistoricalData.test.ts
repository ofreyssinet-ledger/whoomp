import { Observable, of, throwError, concat, first } from 'rxjs';
import { downloadHistoricalData } from './downloadHistoricalData';
import { HistoricalDataDump, HistoricalDataPacket } from '../../data/model';

describe('downloadHistoricalData', () => {
  const makePacket = (i: number): HistoricalDataPacket => ({
    timestampMs: i * 1000,
    unknown: 0,
    heartRate: 60 + i,
    rr: [800 + i],
  });

  let saveFn: jest.Mock<Promise<void>, [HistoricalDataDump]>;
  const deviceId = 'device123';
  const deviceName = 'TestDevice';
  const baseDate = new Date(2021, 0, 1);

  beforeEach(() => {
    saveFn = jest.fn((_: HistoricalDataDump) => Promise.resolve());
  });

  it('buffers correctly into exact chunks and resolves with all data', async () => {
    // Emit 6 packets, bufferSize = 3 → two full buffers, no incomplete remainder.
    const packets = [0, 1, 2, 3, 4, 5].map(makePacket);
    const dataStream = of(...packets);

    const promise = downloadHistoricalData(
      deviceId,
      deviceName,
      dataStream,
      saveFn,
      3,
    );

    const result = await promise;

    // Verify save was called twice, each with 3 packets.
    expect(saveFn).toHaveBeenCalledTimes(2);

    const firstCallArg = saveFn.mock.calls[0][0];
    expect(firstCallArg.deviceName).toBe(deviceName);
    expect(firstCallArg.date).toEqual(new Date(packets[2].timestampMs));
    expect(firstCallArg.dataDump).toEqual(packets.slice(0, 3));

    const secondCallArg = saveFn.mock.calls[1][0];
    expect(secondCallArg.deviceName).toBe(deviceName);
    expect(secondCallArg.date).toEqual(new Date(packets[5].timestampMs));
    expect(secondCallArg.dataDump).toEqual(packets.slice(3, 6));

    // Final result should include all dataDumps
    expect(result.length).toBe(2);
    expect(result[0]).toBe(firstCallArg);
    expect(result[1]).toBe(secondCallArg);
  });

  it('flushes an incomplete final buffer when the stream completes', async () => {
    // Emit 5 packets, bufferSize = 3 → one full buffer of 3, then one incomplete of 2.
    const packets = [0, 1, 2, 3, 4].map(makePacket);
    const dataStream = of(...packets);

    const promise = downloadHistoricalData(
      deviceId,
      deviceName,
      dataStream,
      saveFn,
      3,
    );

    const result = await promise;

    // Verify save was called twice: first with 3, then with remaining 2
    expect(saveFn).toHaveBeenCalledTimes(2);

    const firstChunk = saveFn.mock.calls[0][0];
    expect(firstChunk.dataDump).toEqual(packets.slice(0, 3));
    expect(firstChunk.date).toEqual(new Date(packets[2].timestampMs));

    const secondChunk = saveFn.mock.calls[1][0];
    expect(secondChunk.dataDump).toEqual(packets.slice(3, 5));
    expect(secondChunk.date).toEqual(new Date(packets[4].timestampMs));

    // Final result should include all 5 packets
    expect(result.length).toBe(2);
    expect(result[0]).toBe(firstChunk);
    expect(result[1]).toBe(secondChunk);
  });

  it('does not flush an incomplete final buffer when the stream errors', async () => {
    // Build an observable that emits 4 packets, then errors.
    const packets = [0, 1, 2, 3].map(makePacket);
    const goodStream = of(...packets);
    const errorStream = concat(
      goodStream,
      throwError(() => new Error('stream failed')),
    );

    // We catch the rejection to allow assertions after.
    let caughtError: Error | null = null;
    try {
      await downloadHistoricalData(
        deviceId,
        deviceName,
        errorStream,
        saveFn,
        3,
      );
    } catch (err) {
      caughtError = err as Error;
    }

    // Expect the promise to reject with the stream error
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError?.message).toBe('stream failed');

    // Verify save was called once: with full buffer of 3
    expect(saveFn).toHaveBeenCalledTimes(1);

    const firstChunk = saveFn.mock.calls[0][0];
    expect(firstChunk.dataDump).toEqual(packets.slice(0, 3));
    expect(firstChunk.date).toEqual(new Date(packets[2].timestampMs));
  });

  it('handles bufferSize = 1 (each packet saved individually)', async () => {
    // Emit 3 packets, bufferSize = 1 → each packet saved as its own chunk
    const packets = [0, 1, 2].map(makePacket);
    const dataStream = of(...packets);

    const result = await downloadHistoricalData(
      deviceId,
      deviceName,
      dataStream,
      saveFn,
      1,
    );

    expect(saveFn).toHaveBeenCalledTimes(3);
    packets.forEach((pkt, idx) => {
      const callArg = saveFn.mock.calls[idx][0];
      expect(callArg.dataDump).toEqual([pkt]);
      expect(callArg.date).toEqual(new Date(pkt.timestampMs));
      expect(result[idx]).toEqual(callArg);
    });

    expect(result.length).toBe(3);
  });

  it('handles an empty stream (no packets)', async () => {
    // Emit nothing, bufferSize = 3 → no save calls, but resolves with empty array
    const dataStream = new Observable<HistoricalDataPacket>((subscriber) => {
      subscriber.complete();
    });

    const result = await downloadHistoricalData(
      deviceId,
      deviceName,
      dataStream,
      saveFn,
      3,
    );

    expect(saveFn).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

import {
  serializeHistoricalDataDump,
  deserializeHistoricalDataDump,
  serializeHistoricalDataPacket,
  deserializeHistoricalDataPacket,
  historicalDataPacketTypeguard,
} from './serialization';

describe('Serialization of Historical Data Packets', () => {
  it('should serialize and deserialize a HistoricalDataPacket correctly', () => {
    const packet = {
      timestampMs: 1700000000000,
      heartRate: 75,
      rr: [800, 810, 790],
      unknown: 42,
      originalData: new Uint8Array([1, 2, 3, 4, 5]),
    };

    const serialized = serializeHistoricalDataPacket(packet);
    const deserialized = deserializeHistoricalDataPacket(serialized);

    expect(serialized).toBe('1700000000000 75 [800,810,790] 42 1,2,3,4,5');
    expect(deserialized).toEqual(packet);
  });
});

describe('Historical Data Packet Typeguard', () => {
  it('should return true for a valid HistoricalDataPacket', () => {
    const packet = {
      timestampMs: 1700000000000,
      heartRate: 75,
      rr: [800, 810, 790],
      unknown: 42,
      originalData: new Uint8Array([1, 2, 3, 4, 5]),
    };
    expect(historicalDataPacketTypeguard(packet)).toBe(true);
  });
  const invalidPackets = [
    {
      timestampMs: 'not-a-number',
      heartRate: 75,
      rr: [800],
      unknown: 42,
      originalData: new Uint8Array([1]),
    },
    {
      timestampMs: 1700000000000,
      heartRate: 'not-a-number',
      rr: [800],
      unknown: 42,
      originalData: new Uint8Array([1]),
    },
    {
      timestampMs: 1700000000000,
      heartRate: 75,
      rr: 'not-an-array',
      unknown: 42,
      originalData: new Uint8Array([1]),
    },
    {
      timestampMs: 1700000000000,
      heartRate: 75,
      rr: [800],
      unknown: 'not-a-number',
      originalData: new Uint8Array([1]),
    },
    {
      timestampMs: 1700000000000,
      heartRate: 75,
      rr: [800],
      unknown: 42,
      originalData: 'not-a-Uint8Array',
    },
  ];
  invalidPackets.forEach((packet) => {
    it(`should return false for invalid packet: ${JSON.stringify(packet)}`, () => {
      expect(historicalDataPacketTypeguard(packet)).toBe(false);
    });
  });
});

describe('Serialization of Historical Data Dumps', () => {
  it('should serialize and deserialize a HistoricalDataDump correctly', () => {
    const dump = {
      deviceName: 'TestDevice',
      date: new Date('2023-10-01T12:00:00Z'),
      dataDump: [
        {
          timestampMs: 1700000000000,
          heartRate: 75,
          rr: [800, 810, 790],
          unknown: 42,
          originalData: new Uint8Array([1, 2, 3, 4, 5]),
        },
        {
          timestampMs: 1700000001000,
          heartRate: 80,
          rr: [],
          unknown: 43,
          originalData: new Uint8Array([6, 7, 8, 9, 10]),
        },
        {
          timestampMs: 1700000002000,
          heartRate: 78,
          rr: [790],
          unknown: 44,
          originalData: new Uint8Array([11, 12, 13, 14, 15]),
        },
      ],
    };

    const serialized = serializeHistoricalDataDump(
      dump.deviceName,
      dump.date,
      dump.dataDump,
    );
    const deserialized = deserializeHistoricalDataDump(serialized);

    expect(serialized).toBe(
      `\
TestDevice
2023-10-01T12:00:00.000Z
1700000000000 75 [800,810,790] 42 1,2,3,4,5
1700000001000 80 [] 43 6,7,8,9,10
1700000002000 78 [790] 44 11,12,13,14,15\
`.trim(),
    );
    expect(deserialized).toEqual(dump);
  });

  it('should handle empty data dumps', () => {
    const dump = {
      deviceName: 'EmptyDevice',
      date: new Date('2023-10-01T12:00:00Z'),
      dataDump: [],
    };
    const serialized = serializeHistoricalDataDump(
      dump.deviceName,
      dump.date,
      dump.dataDump,
    );
    const deserialized = deserializeHistoricalDataDump(serialized);
    expect(serialized).toBe(
      `\
EmptyDevice
2023-10-01T12:00:00.000Z
`,
    );
    expect(deserialized).toEqual(dump);
  });

  it('should skip invalid lines during deserialization', () => {
    const data = `\
TestDevice
2023-10-01T12:00:00.000Z

next line is good, this line should be skipped
1700000002000 78 [790] 44 11,12,13,14,15

next line missing timestamp
79 [810] 46 21,22,23,24,25

next line is good
1700000004000 79 [810] 46 21,22,23,24,25

next line missing unknown
1700000004000 79 [810] 21,22,23,24,25

next line has an invalid timestamp
1700000004000a 79 [810] 46 21,22,23,24,25

next line has an invalid rr
1700000004000 79 [notANumber] 46 21,22,23,24,25

next line has an invalid heart rate
1700000004000 notANumber [810] 46 21,22,23,24,25
`;
    const deserialized = deserializeHistoricalDataDump(data);
    expect(deserialized).toEqual({
      deviceName: 'TestDevice',
      date: new Date('2023-10-01T12:00:00Z'),
      dataDump: [
        {
          timestampMs: 1700000002000,
          heartRate: 78,
          rr: [790],
          unknown: 44,
          originalData: new Uint8Array([11, 12, 13, 14, 15]),
        },
        {
          timestampMs: 1700000004000,
          heartRate: 79,
          rr: [810],
          unknown: 46,
          originalData: new Uint8Array([21, 22, 23, 24, 25]),
        },
      ],
    });
  });
});

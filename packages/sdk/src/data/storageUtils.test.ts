import {
  filterDataDumpStorageKeys,
  generateDataDumpStorageKey,
  parseDataDumpStorageKey,
} from './storageUtils';

describe('generateStorageKey', () => {
  it('should generate a valid storage key', () => {
    const deviceName = 'TestDevice';
    const date = new Date('2023-10-01T12:00:00Z');
    const key = generateDataDumpStorageKey(deviceName, date);
    expect(key).toBe('datadump_TestDevice_2023-10-01T12:00:00.000Z');
  });
});

describe('parseStorageKey', () => {
  it('should parse a valid storage key', () => {
    const key = 'datadump_TestDevice_2023-10-01T12:00:00.000Z';
    const parsed = parseDataDumpStorageKey(key);
    expect(parsed).toEqual({
      deviceName: 'TestDevice',
      date: new Date('2023-10-01T12:00:00.000Z'),
    });
  });

  it('should return null for an invalid key format', () => {
    const key = 'InvalidKeyFormat';
    const parsed = parseDataDumpStorageKey(key);
    expect(parsed).toBeNull();
  });

  it('should return null for an invalid date', () => {
    const key = 'TestDevice_InvalidDate';
    const parsed = parseDataDumpStorageKey(key);
    expect(parsed).toBeNull();
  });

  it('should return null for a key that does not start with "datadump_"', () => {
    const key = 'other_TestDevice_2023-10-01T12:00:00.000Z';
    const parsed = parseDataDumpStorageKey(key);
    expect(parsed).toBeNull();
  });
});

describe('filterStorageKeys', () => {
  const deviceAKeys = [
    'datadump_DeviceA_2023-10-01T12:00:00.000Z',
    'datadump_DeviceA_2023-10-03T14:00:00.000Z',
  ];
  const deviceBKeys = [
    'datadump_DeviceB_2023-10-02T13:00:00.000Z',
    'datadump_DeviceB_2023-10-05T16:00:00.000Z',
  ];
  const deviceCKeys = [
    'datadump_DeviceC_2023-10-04T15:00:00.000Z',
    'datadump_DeviceC_2023-10-06T17:00:00.000Z',
  ];

  const invalidKeys = ['InvalidKeyFormat'];

  const keys = [...deviceAKeys, ...deviceBKeys, ...deviceCKeys, ...invalidKeys];

  it('should return all valid keys when no filters are applied', () => {
    const filtered = filterDataDumpStorageKeys(keys);
    expect(filtered).toEqual([...deviceAKeys, ...deviceBKeys, ...deviceCKeys]);
  });

  it('should filter by device name', () => {
    const filteredA = filterDataDumpStorageKeys(keys, 'DeviceA');
    expect(filteredA).toEqual(deviceAKeys);

    const filteredB = filterDataDumpStorageKeys(keys, 'DeviceB');
    expect(filteredB).toEqual(deviceBKeys);

    const filteredC = filterDataDumpStorageKeys(keys, 'DeviceC');
    expect(filteredC).toEqual(deviceCKeys);

    const filteredInvalid = filterDataDumpStorageKeys(keys, 'DeviceX');
    expect(filteredInvalid).toEqual([]);
  });

  it('should filter by date range', () => {
    const fromDate = new Date('2023-10-03T00:00:00.000Z');
    const toDate = new Date('2023-10-05T18:00:00.000Z');

    const filtered = filterDataDumpStorageKeys(
      keys,
      undefined,
      fromDate,
      toDate,
    );
    expect(filtered).toEqual([
      'datadump_DeviceA_2023-10-03T14:00:00.000Z',
      'datadump_DeviceB_2023-10-05T16:00:00.000Z',
      'datadump_DeviceC_2023-10-04T15:00:00.000Z',
    ]);
  });

  it('should filter by device name and date range', () => {
    const fromDate = new Date('2023-10-02T00:00:00.000Z');
    const toDate = new Date('2023-10-04T18:00:00.000Z');

    const filteredA = filterDataDumpStorageKeys(
      keys,
      'DeviceA',
      fromDate,
      toDate,
    );
    expect(filteredA).toEqual(['datadump_DeviceA_2023-10-03T14:00:00.000Z']);

    const filteredB = filterDataDumpStorageKeys(
      keys,
      'DeviceB',
      fromDate,
      toDate,
    );
    expect(filteredB).toEqual(['datadump_DeviceB_2023-10-02T13:00:00.000Z']);

    const filteredC = filterDataDumpStorageKeys(
      keys,
      'DeviceC',
      fromDate,
      toDate,
    );
    expect(filteredC).toEqual(['datadump_DeviceC_2023-10-04T15:00:00.000Z']);
  });
});

import {
  filterStorageKeys,
  generateStorageKey,
  parseStorageKey,
} from './storageUtils';

describe('generateStorageKey', () => {
  it('should generate a valid storage key', () => {
    const deviceName = 'TestDevice';
    const date = new Date('2023-10-01T12:00:00Z');
    const key = generateStorageKey(deviceName, date);
    expect(key).toBe('TestDevice_2023-10-01T12:00:00.000Z');
  });
});

describe('parseStorageKey', () => {
  it('should parse a valid storage key', () => {
    const key = 'TestDevice_2023-10-01T12:00:00.000Z';
    const parsed = parseStorageKey(key);
    expect(parsed).toEqual({
      deviceName: 'TestDevice',
      date: new Date('2023-10-01T12:00:00.000Z'),
    });
  });

  it('should return null for an invalid key format', () => {
    const key = 'InvalidKeyFormat';
    const parsed = parseStorageKey(key);
    expect(parsed).toBeNull();
  });

  it('should return null for an invalid date', () => {
    const key = 'TestDevice_InvalidDate';
    const parsed = parseStorageKey(key);
    expect(parsed).toBeNull();
  });
});

describe('filterStorageKeys', () => {
  const deviceAKeys = [
    'DeviceA_2023-10-01T12:00:00.000Z',
    'DeviceA_2023-10-03T14:00:00.000Z',
  ];
  const deviceBKeys = [
    'DeviceB_2023-10-02T13:00:00.000Z',
    'DeviceB_2023-10-05T16:00:00.000Z',
  ];
  const deviceCKeys = [
    'DeviceC_2023-10-04T15:00:00.000Z',
    'DeviceC_2023-10-06T17:00:00.000Z',
  ];

  const invalidKeys = ['InvalidKeyFormat'];

  const keys = [...deviceAKeys, ...deviceBKeys, ...deviceCKeys, ...invalidKeys];

  it('should return all valid keys when no filters are applied', () => {
    const filtered = filterStorageKeys(keys);
    expect(filtered).toEqual([...deviceAKeys, ...deviceBKeys, ...deviceCKeys]);
  });

  it('should filter by device name', () => {
    const filteredA = filterStorageKeys(keys, 'DeviceA');
    expect(filteredA).toEqual(deviceAKeys);

    const filteredB = filterStorageKeys(keys, 'DeviceB');
    expect(filteredB).toEqual(deviceBKeys);

    const filteredC = filterStorageKeys(keys, 'DeviceC');
    expect(filteredC).toEqual(deviceCKeys);

    const filteredInvalid = filterStorageKeys(keys, 'DeviceX');
    expect(filteredInvalid).toEqual([]);
  });

  it('should filter by date range', () => {
    const fromDate = new Date('2023-10-03T00:00:00.000Z');
    const toDate = new Date('2023-10-05T18:00:00.000Z');

    const filtered = filterStorageKeys(keys, undefined, fromDate, toDate);
    expect(filtered).toEqual([
      'DeviceA_2023-10-03T14:00:00.000Z',
      'DeviceB_2023-10-05T16:00:00.000Z',
      'DeviceC_2023-10-04T15:00:00.000Z',
    ]);
  });

  it('should filter by device name and date range', () => {
    const fromDate = new Date('2023-10-02T00:00:00.000Z');
    const toDate = new Date('2023-10-04T18:00:00.000Z');

    const filteredA = filterStorageKeys(keys, 'DeviceA', fromDate, toDate);
    expect(filteredA).toEqual(['DeviceA_2023-10-03T14:00:00.000Z']);

    const filteredB = filterStorageKeys(keys, 'DeviceB', fromDate, toDate);
    expect(filteredB).toEqual(['DeviceB_2023-10-02T13:00:00.000Z']);

    const filteredC = filterStorageKeys(keys, 'DeviceC', fromDate, toDate);
    expect(filteredC).toEqual(['DeviceC_2023-10-04T15:00:00.000Z']);
  });
});

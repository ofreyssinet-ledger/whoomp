import {
  Storage,
  deserializeHistoricalDataDump,
  serializeHistoricalDataDump,
  filterDataDumpStorageKeys,
  generateDataDumpStorageKey,
  HistoricalDataDump,
} from '@whoomp/sdk';

import {MMKV} from 'react-native-mmkv';

export const storage = new MMKV();

export const mmkvStorage: Storage = {
  saveHistoricalDataDump: async historicalDataDump => {
    const {deviceName, date, dataDump} = historicalDataDump;
    console.log(
      `[mmkvStorage][saveHistoricalDataDump] Saving historical data dump`,
      historicalDataDump,
    );
    const key = generateDataDumpStorageKey(deviceName, date);
    const serializedData = serializeHistoricalDataDump(
      deviceName,
      date,
      dataDump,
    );
    console.log(
      `[mmkvStorage][saveHistoricalDataDump] Data serialized for key:`,
      key,
    );
    storage.set(key, serializedData);
    console.log(
      `[mmkvStorage][saveHistoricalDataDump] Saved historical data dump for ${deviceName} on ${date}`,
    );
  },

  getHistoricalDataDumps: async (deviceName, fromDate, toDate) => {
    const allKeys = storage.getAllKeys();
    const keys = filterDataDumpStorageKeys(
      allKeys,
      deviceName,
      fromDate,
      toDate,
    );
    const dumps: Array<HistoricalDataDump> = [];

    for (const key of keys) {
      const serializedData = storage.getString(key);
      if (serializedData) {
        try {
          const dump = deserializeHistoricalDataDump(serializedData);
          dumps.push(dump);
        } catch (error) {
          console.error(`Error deserializing data dump for key ${key}:`, error);
        }
      } else {
        console.warn(`No data found for key ${key}`);
      }
    }

    return dumps;
  },

  deleteHistoricalDataDumpsInRange: async (deviceName, fromDate, toDate) => {
    const allKeys = storage.getAllKeys();
    const keys = filterDataDumpStorageKeys(
      allKeys,
      deviceName,
      fromDate,
      toDate,
    );

    for (const key of keys) {
      storage.delete(key);
      console.log(`Deleted historical data dump for key ${key}`);
    }
  },

  deleteHistoricalDataDump: async historicalDataDump => {
    const {deviceName, date} = historicalDataDump;
    const key = generateDataDumpStorageKey(deviceName, date);
    storage.delete(key);
    console.log(
      `[mmkvStorage][deleteHistoricalDataDump] Deleted historical data dump for ${deviceName} on ${date}`,
    );
  },
};

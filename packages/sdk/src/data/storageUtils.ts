export function generateDataDumpStorageKey(
  deviceName: string,
  date: Date,
): string {
  const dateString = date.toISOString(); // Format as YYYY-MM-DD
  return `datadump_${deviceName}_${dateString}`;
}

export function parseDataDumpStorageKey(key: string): {
  deviceName: string;
  date: Date;
} | null {
  const parts = key.split('_');
  if (parts.length !== 3) {
    return null; // Invalid key format
  }

  if (parts[0] !== 'datadump') {
    return null; // Not a data dump key
  }
  const deviceName = parts[1];
  const date = new Date(parts[2]);

  if (isNaN(date.getTime())) {
    return null; // Invalid date
  }

  return { deviceName, date };
}

export function filterDataDumpStorageKeys(
  keys: string[],
  deviceName?: string,
  fromDate?: Date,
  toDate?: Date,
): string[] {
  return keys
    .filter((key) => {
      const parsed = parseDataDumpStorageKey(key);
      if (!parsed) {
        return false; // Invalid key format
      }

      if (deviceName && parsed.deviceName !== deviceName) {
        return false; // Device name does not match
      }

      if (fromDate && parsed.date < fromDate) {
        return false; // Date is before fromDate
      }

      if (toDate && parsed.date > toDate) {
        return false; // Date is after toDate
      }

      return true; // Key matches all criteria
    })
    .sort(); // Sort keys alphabetically
}

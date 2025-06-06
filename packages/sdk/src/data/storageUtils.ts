export function generateStorageKey(deviceName: string, date: Date): string {
  const dateString = date.toISOString(); // Format as YYYY-MM-DD
  return `${deviceName}_${dateString}`;
}

export function parseStorageKey(key: string): {
  deviceName: string;
  date: Date;
} | null {
  const parts = key.split('_');
  if (parts.length !== 2) {
    return null; // Invalid key format
  }

  const deviceName = parts[0];
  const date = new Date(parts[1]);

  if (isNaN(date.getTime())) {
    return null; // Invalid date
  }

  return { deviceName, date };
}

export function filterStorageKeys(
  keys: string[],
  deviceName?: string,
  fromDate?: Date,
  toDate?: Date,
): string[] {
  return keys.filter((key) => {
    const parsed = parseStorageKey(key);
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
  });
}

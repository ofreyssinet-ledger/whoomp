import {eq} from 'drizzle-orm';
import {useLiveQuery} from 'drizzle-orm/expo-sqlite';
import {useDisplayedDeviceOrThrow} from '../context/DisplayedDeviceContext';
import {lastSync} from '../db/schema';
import {useDrizzleDB} from './useDrizzleDB';

export function useLastSyncDate() {
  const displayedDevice = useDisplayedDeviceOrThrow();

  const drizzleDB = useDrizzleDB();

  const {data: syncStatus} = useLiveQuery(
    drizzleDB
      .select()
      .from(lastSync)
      .where(eq(lastSync.deviceName, displayedDevice.deviceName))
      .limit(1),
  );

  const deviceSyncStatus = syncStatus?.[0];

  return deviceSyncStatus ? new Date(deviceSyncStatus.lastSyncedMs) : null;
}

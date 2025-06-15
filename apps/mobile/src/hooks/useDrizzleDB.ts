import {drizzle} from 'drizzle-orm/expo-sqlite';
import {useSQLiteContext} from 'expo-sqlite';
import * as schema from '../db/schema';
import {useMemo} from 'react';

export function useDrizzleDB() {
  const db = useSQLiteContext();
  if (!db) {
    throw new Error('useDrizzleDB must be used within a DB Provider');
  }
  return useMemo(() => drizzle(db, {schema}), [db]);
}

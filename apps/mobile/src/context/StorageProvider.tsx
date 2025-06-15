import {useMemo} from 'react';
import {StorageContext} from './StorageContext';
import {useSQLiteContext} from 'expo-sqlite';
import {mobileStorage} from '../data/MobileStorage';

export function StorageProvider({children}: {children: React.ReactNode}) {
  const db = useSQLiteContext();
  const storage = useMemo(() => mobileStorage(db), [db]);
  return (
    <StorageContext.Provider value={storage}>
      {children}
    </StorageContext.Provider>
  );
}

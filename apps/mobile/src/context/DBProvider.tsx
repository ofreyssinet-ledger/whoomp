import {Suspense} from 'react';
import {ActivityIndicator} from 'react-native';
import {SQLiteProvider, openDatabaseSync} from 'expo-sqlite';
import {drizzle} from 'drizzle-orm/expo-sqlite';
import {useMigrations} from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';

export const DATABASE_NAME = 'db';

export default function DBProvider({children}: {children: React.ReactNode}) {
  const expoDb = openDatabaseSync(DATABASE_NAME);
  const db = drizzle(expoDb);
  const {success, error} = useMigrations(db, migrations);
  return (
    <Suspense fallback={<ActivityIndicator size="large" />}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        options={{enableChangeListener: true}}
        useSuspense>
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}

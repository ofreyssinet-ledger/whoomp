import {Suspense, useEffect} from 'react';
import {ActivityIndicator, Alert} from 'react-native';
import {SQLiteProvider, openDatabaseSync} from 'expo-sqlite';
import {drizzle} from 'drizzle-orm/expo-sqlite';
import {useMigrations} from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';

export const DATABASE_NAME = 'db_3';

export default function DBProvider({children}: {children: React.ReactNode}) {
  const expoDb = openDatabaseSync(DATABASE_NAME);
  const db = drizzle(expoDb);

  const {success, error} = useMigrations(db, migrations);
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Migration Error',
        `An error occurred during database migration: ${error.message}, ${error.stack}`,
      );
      console.error('Migration error:', error);
    } else if (success) {
      console.log('Migrations completed successfully');
    }
  }, [success, error]);
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

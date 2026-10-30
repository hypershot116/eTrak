import { openDatabaseAsync } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

export function DbSmokeTest() {
  const [status, setStatus] = useState('Testing database...');

  useEffect(() => {
    (async () => {
      try {
        const db = await openDatabaseAsync('etrak-test.db');
        await db.execAsync(
          'CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL);'
        );
        await db.runAsync('INSERT INTO visits (at) VALUES (?)', Date.now());
        const row = await db.getFirstAsync<{ n: number }>(
          'SELECT COUNT(*) AS n FROM visits'
        );
        setStatus(`Database OK: ${row?.n ?? 0} visit(s) saved`);
      } catch (e) {
        setStatus(`Database error: ${String(e)}`);
      }
    })();
  }, []);

  return (
    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{status}</Text>
  );
}

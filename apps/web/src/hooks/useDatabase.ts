import { useEffect, useState } from 'react';
import { getDatabase, GlamDatabase } from '../db/database';

export function useDatabase() {
  const [db, setDb] = useState<GlamDatabase | null>(null);

  useEffect(() => {
    getDatabase().then(setDb).catch(console.error);
  }, []);

  return db;
}

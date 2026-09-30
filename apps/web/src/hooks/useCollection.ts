import { useEffect, useState } from 'react';
import { useDatabase } from './useDatabase';
import { DatabaseCollections } from '../db/database';

export function useCollection<K extends keyof DatabaseCollections>(
  collectionName: K,
  queryOptions?: {
    selector?: any;
    sort?: any[];
    limit?: number;
  }
) {
  const db = useDatabase();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    
    const collection = db[collectionName];
    let query = collection.find({
      selector: {
        deleted_at: { $eq: null },
        ...queryOptions?.selector
      }
    });

    if (queryOptions?.sort) {
      query = query.sort(queryOptions.sort);
    }
    if (queryOptions?.limit) {
      query = query.limit(queryOptions.limit);
    }

    const sub = query.$.subscribe((results: any[]) => {
      setDocs(results.map((d: any) => d.toJSON()));
      setLoading(false);
    });

    return () => sub.unsubscribe();
  }, [db, collectionName, JSON.stringify(queryOptions)]);

  return { docs, loading };
}

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
  const [docs, setDocs] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`glamos_local_${collectionName}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Escuchar eventos de actualización local inmediata
    const handleStorageChange = () => {
      try {
        const cached = localStorage.getItem(`glamos_local_${collectionName}`);
        if (cached) setDocs(JSON.parse(cached));
      } catch {}
    };
    window.addEventListener(`glamos_updated_${collectionName}`, handleStorageChange);

    if (!db) {
      return () => {
        window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
      };
    }
    
    try {
      const collection = db[collectionName];
      if (!collection) {
        return () => {
          window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
        };
      }

      let query = collection.find({
        selector: queryOptions?.selector || {}
      });

      if (queryOptions?.sort) {
        query = query.sort(queryOptions.sort);
      }
      if (queryOptions?.limit) {
        query = query.limit(queryOptions.limit);
      }

      const sub = query.$.subscribe({
        next: (results: any[]) => {
          const validDocs = results
            .map((d: any) => d.toJSON())
            .filter((d: any) => !d.deleted_at);
          setDocs(validDocs);
          localStorage.setItem(`glamos_local_${collectionName}`, JSON.stringify(validDocs));
          setLoading(false);
        },
        error: (err: any) => {
          console.warn(`Query error on ${collectionName}:`, err);
          setLoading(false);
        }
      });

      return () => {
        sub.unsubscribe();
        window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
      };
    } catch (e) {
      console.warn('Error iniciando query:', e);
      return () => {
        window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
      };
    }
  }, [db, collectionName, JSON.stringify(queryOptions)]);

  return { docs, loading };
}

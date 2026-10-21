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
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setDocs(parsed);
          }
        }
      } catch {}
    };
    window.addEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    if (!db) {
      return () => {
        window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
    
    try {
      const collection = db[collectionName];
      if (!collection) {
        return () => {
          window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
          window.removeEventListener('storage', handleStorageChange);
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

          if (validDocs.length > 0) {
            setDocs(validDocs);
            localStorage.setItem(`glamos_local_${collectionName}`, JSON.stringify(validDocs));
          } else {
            // Si RxDB aún no tiene datos o está arrancando en frío, proteger la caché local
            try {
              const cached = localStorage.getItem(`glamos_local_${collectionName}`);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setDocs(parsed);
                  // Repoblar RxDB con los documentos de la caché
                  collection.bulkUpsert(parsed).catch(() => {});
                  setLoading(false);
                  return;
                }
              }
            } catch {}
            setDocs([]);
          }
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
        window.removeEventListener('storage', handleStorageChange);
      };
    } catch (e) {
      console.warn('Error iniciando query:', e);
      return () => {
        window.removeEventListener(`glamos_updated_${collectionName}`, handleStorageChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [db, collectionName, JSON.stringify(queryOptions)]);

  return { docs, loading };
}

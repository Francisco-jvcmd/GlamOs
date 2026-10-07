import { createRxDatabase, RxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import * as schemas from './schemas';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBUpdatePlugin);

export type DatabaseCollections = {
  sales: any;
  sale_items: any;
  services: any;
  products: any;
  clients: any;
  stock_movements: any;
  fixed_expenses: any;
};

export type GlamDatabase = RxDatabase<DatabaseCollections>;

let dbPromise: Promise<GlamDatabase> | null = null;

export async function getDatabase(): Promise<GlamDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist().catch(() => {});
      }
    } catch {}

    const initInstance = async (dbName: string) => {
      const db = await createRxDatabase<DatabaseCollections>({
        name: dbName,
        storage: getRxStorageDexie(),
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true,
      });

      await db.addCollections({
        sales: { schema: schemas.salesSchema },
        sale_items: { schema: schemas.saleItemsSchema },
        services: { schema: schemas.servicesSchema },
        products: { schema: schemas.productsSchema },
        clients: { schema: schemas.clientsSchema },
        stock_movements: { schema: schemas.stockMovementsSchema },
        fixed_expenses: { schema: schemas.fixedExpensesSchema },
      });

      return db;
    };

    try {
      return await initInstance('glamos_app_v2');
    } catch (firstErr) {
      console.warn('Primer intento falló por caché IndexedDB previa, auto-recuperando:', firstErr);
      try {
        if (typeof indexedDB !== 'undefined') {
          indexedDB.deleteDatabase('glamosdb');
          indexedDB.deleteDatabase('glamos_app_v2');
        }
      } catch {}
      return await initInstance('glamos_app_v3');
    }
  })();

  return dbPromise;
}

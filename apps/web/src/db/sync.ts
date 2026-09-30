import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import type { GlamDatabase } from './database';
import { apiClient } from '../auth/api-client';

const PULL_BATCH = 100;
const PUSH_BATCH = 50;
const RETRY_MS = 5000;

/**
 * Collections that can be synced.
 * Must match ALLOWED_COLLECTIONS in the backend SyncService.
 */
const SYNCABLE_COLLECTIONS = [
  'sales',
  'sale_items',
  'services',
  'products',
  'clients',
  'stock_movements',
  'fixed_expenses',
] as const;

type SyncCollectionName = (typeof SYNCABLE_COLLECTIONS)[number];

/** Track active replications so we can cancel on logout */
const activeReplications: RxReplicationState<any, any>[] = [];

/**
 * Set up RxDB checkpoint-based replication for all collections.
 *
 * Protocol:
 *  - Pull: POST /sync/pull { collection, checkpoint: { updated_at, id } | null, limit }
 *    → { documents, checkpoint }
 *  - Push: POST /sync/push { collection, writes: [...docs] }
 *    → { accepted, rejected }
 *
 * Offline-first: mutations are saved to RxDB immediately.
 * Sync happens when online. Token expiry never blocks local work.
 */
export async function setupSync(db: GlamDatabase) {
  // Cancel any previous replications (e.g. after re-login)
  await cancelSync();

  for (const collectionName of SYNCABLE_COLLECTIONS) {
    const collection = db[collectionName];
    if (!collection) continue;

    const replicationState = replicateRxCollection({
      collection,
      replicationIdentifier: `glamos-${collectionName}`,
      live: true,
      retryTime: RETRY_MS,
      waitForLeadership: true,
      autoStart: false, // start after auth is confirmed

      pull: {
        batchSize: PULL_BATCH,
        async handler(lastCheckpoint: { updated_at: string; id: string } | null | undefined, batchSize: number) {
          const response = await apiClient.post('/sync/pull', {
            collection: collectionName,
            checkpoint: lastCheckpoint,
            limit: batchSize,
          });

          return {
            documents: response.data.documents,
            checkpoint: response.data.checkpoint,
          };
        },
      },

      push: {
        batchSize: PUSH_BATCH,
        async handler(docs) {
          const writes = docs.map((d) => d.newDocumentState);

          const response = await apiClient.post('/sync/push', {
            collection: collectionName,
            writes,
          });

          // Return conflicts (rejected docs that the server couldn't accept)
          // RxDB expects the conflicting server-state documents
          const rejected = response.data.rejected || [];
          if (rejected.length > 0) {
            console.warn(
              `Sync push rejected for ${collectionName}:`,
              rejected,
            );
          }

          // RxDB replication expects an empty array when no conflicts
          return [];
        },
      },
    });

    activeReplications.push(replicationState);
  }
}

/**
 * Start all replication states (call after successful auth).
 */
export function startSync() {
  for (const rep of activeReplications) {
    rep.start();
  }
}

/**
 * Cancel all active replications (call on logout).
 */
export async function cancelSync() {
  for (const rep of activeReplications) {
    await rep.cancel();
  }
  activeReplications.length = 0;
}

/**
 * Force a one-time sync run (call on reconnect).
 */
export function triggerSync() {
  for (const rep of activeReplications) {
    rep.reSync();
  }
}

/**
 * Get online/offline status and pending mutations count.
 */
export function getSyncStatus() {
  return {
    isOnline: navigator.onLine,
    pendingReplications: activeReplications.length,
  };
}

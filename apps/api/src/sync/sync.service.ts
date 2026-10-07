import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PoolClient } from 'pg';

/**
 * Whitelist of collections + their allowed columns.
 * Prevents SQL injection via dynamic table/column names.
 */
const COLLECTION_SCHEMA: Record<string, string[]> = {
  sales: [
    'id', 'organization_id', 'employee_id', 'client_id',
    'subtotal', 'discount_total', 'final_total', 'tip_amount',
    'payment_method', 'cash_amount', 'transfer_amount',
    'transfer_receipt_key', 'status',
    'voided_at', 'voided_by', 'void_reason',
    'created_at', 'updated_at', 'deleted_at',
  ],
  sale_items: [
    'id', 'sale_id', 'organization_id', 'service_id', 'product_id',
    'quantity', 'unit_price', 'discount_percentage', 'line_total',
    'created_at', 'updated_at',
  ],
  services: [
    'id', 'organization_id', 'name', 'base_price',
    'active_discount_percentage', 'discount_starts_at', 'discount_ends_at',
    'created_at', 'updated_at', 'deleted_at',
  ],
  products: [
    'id', 'organization_id', 'name', 'sku',
    'unit_cost', 'unit_price', 'current_stock', 'min_stock_alert',
    'created_at', 'updated_at', 'deleted_at',
  ],
  clients: [
    'id', 'organization_id', 'full_name', 'phone_whatsapp',
    'birth_date', 'consent_given_at',
    'created_at', 'updated_at', 'deleted_at',
  ],
  stock_movements: [
    'id', 'organization_id', 'product_id',
    'delta', 'reason', 'reference_id',
    'created_at', 'updated_at',
  ],
  fixed_expenses: [
    'id', 'organization_id', 'category', 'description',
    'amount', 'expense_date', 'registered_by',
    'created_at', 'updated_at', 'deleted_at',
  ],
  commission_rules: [
    'id', 'organization_id', 'employee_id', 'service_id',
    'percentage',
    'created_at', 'updated_at', 'deleted_at',
  ],
  salary_advances: [
    'id', 'organization_id', 'employee_id',
    'amount', 'note', 'advance_date', 'registered_by',
    'created_at', 'updated_at',
  ],
};

const ALLOWED_COLLECTIONS = Object.keys(COLLECTION_SCHEMA);

// Collections that are insert-only (no upsert)
const INSERT_ONLY_COLLECTIONS = new Set(['stock_movements']);

function toUuid(val: any): string {
  if (typeof val !== 'string' || !val) return '00000000-0000-4000-a000-000000000000';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return val.toLowerCase();
  }
  let hex = '';
  for (let i = 0; i < val.length; i++) {
    hex += (val.charCodeAt(i) % 16).toString(16);
  }
  while (hex.length < 32) hex += '0';
  hex = hex.substring(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

@Injectable()
export class SyncService {
  constructor(private db: DatabaseService) {}

  /**
   * Pull documents using RxDB checkpoint-based replication.
   * Checkpoint = (updated_at, id) — documents are ordered by this pair.
   * RLS automatically filters by organization_id.
   */
  async pull(
    organizationId: string,
    userRole: string,
    collection: string,
    checkpoint: { updated_at: string; id: string } | null,
    limit: number,
  ) {
    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      throw new BadRequestException(`Invalid collection: ${collection}`);
    }

    const validOrgId = toUuid(organizationId);
    return this.db.withTenant(validOrgId, async (client: PoolClient) => {
      const params: unknown[] = [];
      let whereClause = '';

      if (checkpoint?.updated_at && checkpoint?.id) {
        whereClause = `WHERE (updated_at > $1 OR (updated_at = $1 AND id > $2))`;
        params.push(checkpoint.updated_at, checkpoint.id);
      }

      const limitParam = `$${params.length + 1}`;
      params.push(limit);

      // Table name is safe — it comes from ALLOWED_COLLECTIONS whitelist
      const sql = `
        SELECT * FROM ${collection}
        ${whereClause}
        ORDER BY updated_at ASC, id ASC
        LIMIT ${limitParam}
      `;

      const res = await client.query(sql, params);
      let documents = res.rows;

      // Mask sensitive fields for EMPLOYEE role
      if (collection === 'clients' && userRole === 'EMPLOYEE') {
        documents = documents.map((doc) => ({
          ...doc,
          phone_whatsapp: doc.phone_whatsapp
            ? `***${doc.phone_whatsapp.slice(-3)}`
            : null,
        }));
      }

      const newCheckpoint =
        documents.length > 0
          ? {
              updated_at: documents[documents.length - 1].updated_at,
              id: documents[documents.length - 1].id,
            }
          : checkpoint; // return same checkpoint if no new docs

      return { documents, checkpoint: newCheckpoint };
    });
  }

  /**
   * Push documents from client.
   * Uses UPSERT (ON CONFLICT DO UPDATE) for most collections.
   * stock_movements is insert-only.
   * Column names are validated against COLLECTION_SCHEMA whitelist.
   */
  async push(
    organizationId: string,
    collection: string,
    writes: Record<string, unknown>[],
  ) {
    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      throw new BadRequestException(`Invalid collection: ${collection}`);
    }

    const allowedColumns = COLLECTION_SCHEMA[collection];
    const validOrgId = toUuid(organizationId);

    return this.db.withTenant(validOrgId, async (client: PoolClient) => {
      const accepted: string[] = [];
      const rejected: Array<{ id: string; reason: string }> = [];

      for (const write of writes) {
        try {
          // Force organization_id to the authenticated tenant and sanitize all UUID fields
          const doc: Record<string, unknown> = {
            ...write,
            id: toUuid(write.id),
            organization_id: validOrgId,
          };
          if (doc.employee_id) doc.employee_id = toUuid(doc.employee_id);
          if (doc.client_id) doc.client_id = toUuid(doc.client_id);
          if (doc.service_id) doc.service_id = toUuid(doc.service_id);
          if (doc.product_id) doc.product_id = toUuid(doc.product_id);
          if (doc.sale_id) doc.sale_id = toUuid(doc.sale_id);

          // Filter to only allowed columns that exist in the document
          const columns = Object.keys(doc).filter((k) =>
            allowedColumns.includes(k),
          );
          const values = columns.map((k) => doc[k]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          if (INSERT_ONLY_COLLECTIONS.has(collection)) {
            // Insert-only: ignore conflicts (idempotent)
            await client.query(
              `INSERT INTO ${collection} (${columns.join(', ')})
               VALUES (${placeholders})
               ON CONFLICT (id) DO NOTHING`,
              values,
            );

            // Side effect: update current_stock on products
            if (collection === 'stock_movements' && doc.delta != null) {
              await client.query(
                `UPDATE products
                 SET current_stock = current_stock + $1
                 WHERE id = $2 AND organization_id = $3`,
                [doc.delta, doc.product_id, organizationId],
              );
            }
          } else {
            // Upsert: ON CONFLICT DO UPDATE for all non-PK columns
            const updateColumns = columns.filter(
              (k) => k !== 'id' && k !== 'created_at',
            );
            const updateSet = updateColumns
              .map((k) => `${k} = EXCLUDED.${k}`)
              .join(', ');

            await client.query(
              `INSERT INTO ${collection} (${columns.join(', ')})
               VALUES (${placeholders})
               ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
              values,
            );
          }

          accepted.push(doc.id as string);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          rejected.push({ id: write.id as string, reason: message });
        }
      }

      return { accepted, rejected };
    });
  }
}

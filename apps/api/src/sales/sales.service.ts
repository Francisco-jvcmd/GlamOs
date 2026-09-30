import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SalesService {
  constructor(private db: DatabaseService) {}

  /**
   * Void a sale — OWNER_ADMIN only, 24h window, ACID transaction.
   * Reverses stock for any product-based sale items.
   */
  async voidSale(
    organizationId: string,
    userId: string,
    saleId: string,
    reason: string,
  ) {
    return this.db.withTenant(organizationId, async (client) => {
      const saleRes = await client.query(
        `SELECT * FROM sales WHERE id = $1 AND status = 'COMPLETED'`,
        [saleId],
      );
      const sale = saleRes.rows[0];
      if (!sale) throw new NotFoundException('Sale not found or already voided');

      // 24h window check against server clock
      const hoursDiff =
        (Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        throw new ForbiddenException({
          code: 'RULE_VIOLATION_EXPIRATION_LIMIT',
          message: 'Cannot void sale after 24 hours',
        });
      }

      // Void the sale
      await client.query(
        `UPDATE sales
         SET status = 'VOIDED', voided_at = NOW(), voided_by = $1, void_reason = $2
         WHERE id = $3`,
        [userId, reason, saleId],
      );

      // Reverse stock for product items in the same transaction
      const itemsRes = await client.query(
        `SELECT * FROM sale_items WHERE sale_id = $1 AND product_id IS NOT NULL`,
        [saleId],
      );
      for (const item of itemsRes.rows) {
        // Insert reversal stock movement (positive delta = stock returned)
        await client.query(
          `INSERT INTO stock_movements
             (organization_id, product_id, delta, reason, reference_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [organizationId, item.product_id, item.quantity, 'VOID_REVERSAL', saleId],
        );
        await client.query(
          `UPDATE products SET current_stock = current_stock + $1 WHERE id = $2`,
          [item.quantity, item.product_id],
        );
      }

      // Audit log (append-only)
      await client.query(
        `INSERT INTO audit_logs
           (organization_id, actor_id, action, entity, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          organizationId,
          userId,
          'VOID_SALE',
          'sales',
          saleId,
          JSON.stringify({ reason, original_total: sale.final_total }),
        ],
      );

      return { success: true };
    });
  }

  /**
   * List sales. EMPLOYEE role sees only their own sales.
   */
  async getSales(
    organizationId: string,
    userRole: string,
    userId: string,
    filters: {
      employee_id?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.db.withTenant(organizationId, async (client) => {
      const params: unknown[] = [];
      const where: string[] = [];

      // EMPLOYEE always filtered to own sales
      if (userRole === 'EMPLOYEE') {
        params.push(userId);
        where.push(`employee_id = $${params.length}`);
      } else if (filters.employee_id) {
        params.push(filters.employee_id);
        where.push(`employee_id = $${params.length}`);
      }

      if (filters.date_from) {
        params.push(filters.date_from);
        where.push(`created_at >= $${params.length}`);
      }
      if (filters.date_to) {
        params.push(filters.date_to);
        where.push(`created_at <= $${params.length}`);
      }

      const whereClause =
        where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

      const limit = filters.limit || 50;
      const page = filters.page || 1;
      params.push(limit, (page - 1) * limit);

      const sql = `
        SELECT s.*, json_agg(si.*) AS items
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const res = await client.query(sql, params);
      return res.rows;
    });
  }
}

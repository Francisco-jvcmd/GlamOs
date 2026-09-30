import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  constructor(private db: DatabaseService) {}

  async adjustStock(organizationId: string, userId: string, productId: string, delta: number, reason: string) {
    return this.db.withTenant(organizationId, async (client) => {
      await client.query(
        `INSERT INTO stock_movements (organization_id, product_id, type, quantity_delta, reason, created_by)
         VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5)`,
        [organizationId, productId, delta, reason, userId]
      );
      
      await client.query(
        `UPDATE products SET current_stock = current_stock + $1 WHERE id = $2`,
        [delta, productId]
      );

      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'STOCK_ADJUST', 'product', $3, $4)`,
        [organizationId, userId, productId, JSON.stringify({ delta, reason })]
      );

      return { success: true };
    });
  }

  async getProducts(organizationId: string) {
    return this.db.withTenant(organizationId, async (client) => {
      const res = await client.query('SELECT * FROM products WHERE organization_id = $1 AND deleted_at IS NULL', [organizationId]);
      return res.rows;
    });
  }

  async getLowStock(organizationId: string) {
    return this.db.withTenant(organizationId, async (client) => {
      const res = await client.query(
        'SELECT * FROM products WHERE organization_id = $1 AND current_stock < min_stock_alert AND deleted_at IS NULL',
        [organizationId]
      );
      return res.rows;
    });
  }
}

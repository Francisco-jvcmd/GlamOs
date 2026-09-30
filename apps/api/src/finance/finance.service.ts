import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FinanceService {
  constructor(private db: DatabaseService) {}

  /**
   * Revenue breakdown by payment method and employee.
   */
  async getRevenue(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    return this.db.withTenant(organizationId, async (client) => {
      const params: unknown[] = [];
      const where: string[] = [`status != 'VOIDED'`];

      if (dateFrom) {
        params.push(dateFrom);
        where.push(`created_at >= $${params.length}`);
      }
      if (dateTo) {
        params.push(dateTo);
        where.push(`created_at <= $${params.length}`);
      }

      const whereClause = where.join(' AND ');

      // Total by payment method
      const byMethodRes = await client.query(
        `SELECT payment_method, SUM(final_total) AS total
         FROM sales
         WHERE ${whereClause}
         GROUP BY payment_method`,
        params,
      );

      // Total by employee
      const byEmployeeRes = await client.query(
        `SELECT s.employee_id, u.full_name AS employee_name, SUM(s.final_total) AS total
         FROM sales s
         LEFT JOIN users u ON u.id = s.employee_id
         WHERE s.${whereClause.replace(/created_at/g, 's.created_at').replace(/status/g, 's.status')}
         GROUP BY s.employee_id, u.full_name`,
        params,
      );

      // Grand total
      const totalRes = await client.query(
        `SELECT SUM(final_total) AS total, SUM(tip_amount) AS total_tips
         FROM sales
         WHERE ${whereClause}`,
        params,
      );

      return {
        total: parseFloat(totalRes.rows[0]?.total || '0'),
        total_tips: parseFloat(totalRes.rows[0]?.total_tips || '0'),
        by_payment_method: byMethodRes.rows,
        by_employee: byEmployeeRes.rows,
      };
    });
  }

  /**
   * Corte de caja: ingresos - costos productos - comisiones - gastos fijos = utilidad neta
   */
  async getCorteCaja(organizationId: string, date: string) {
    return this.db.withTenant(organizationId, async (client) => {
      // Revenue for the day
      const salesRes = await client.query(
        `SELECT
           SUM(final_total) AS revenue,
           SUM(tip_amount) AS tips,
           COUNT(*) AS sale_count
         FROM sales
         WHERE DATE(created_at) = $1 AND status != 'VOIDED'`,
        [date],
      );
      const revenue = parseFloat(salesRes.rows[0]?.revenue || '0');
      const tips = parseFloat(salesRes.rows[0]?.tips || '0');
      const saleCount = parseInt(salesRes.rows[0]?.sale_count || '0', 10);

      // Product cost for items sold that day
      const costRes = await client.query(
        `SELECT SUM(si.quantity * p.unit_cost) AS product_cost
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN products p ON p.id = si.product_id
         WHERE si.product_id IS NOT NULL
           AND DATE(s.created_at) = $1
           AND s.status != 'VOIDED'`,
        [date],
      );
      const productCost = parseFloat(costRes.rows[0]?.product_cost || '0');

      // Commissions for the day
      const commRes = await client.query(
        `SELECT SUM(s.final_total * cr.percentage / 100) AS commission_total
         FROM sales s
         JOIN commission_rules cr ON cr.organization_id = s.organization_id
           AND cr.deleted_at IS NULL
           AND (cr.employee_id IS NULL OR cr.employee_id = s.employee_id)
         WHERE DATE(s.created_at) = $1 AND s.status != 'VOIDED'`,
        [date],
      );
      const commissions = parseFloat(commRes.rows[0]?.commission_total || '0');

      // Fixed expenses for the month containing this date
      const expRes = await client.query(
        `SELECT SUM(amount) AS total_expenses
         FROM fixed_expenses
         WHERE deleted_at IS NULL
           AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM $1::date)
           AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM $1::date)`,
        [date],
      );
      const fixedExpenses = parseFloat(expRes.rows[0]?.total_expenses || '0');

      return {
        date,
        sale_count: saleCount,
        revenue,
        tips,
        product_cost: productCost,
        commissions,
        fixed_expenses: fixedExpenses,
        net_utility: revenue - productCost - commissions - fixedExpenses,
      };
    });
  }

  /**
   * List fixed expenses with optional date filter.
   */
  async getExpenses(organizationId: string, month?: string) {
    return this.db.withTenant(organizationId, async (client) => {
      if (month) {
        const res = await client.query(
          `SELECT * FROM fixed_expenses
           WHERE deleted_at IS NULL
             AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM $1::date)
             AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM $1::date)
           ORDER BY expense_date DESC`,
          [month],
        );
        return res.rows;
      }
      const res = await client.query(
        `SELECT * FROM fixed_expenses
         WHERE deleted_at IS NULL
         ORDER BY expense_date DESC`,
      );
      return res.rows;
    });
  }

  /**
   * Add a fixed expense.
   */
  async addExpense(
    organizationId: string,
    userId: string,
    expense: {
      id: string;
      category: string;
      description?: string | null;
      amount: number;
      expense_date: string;
    },
  ) {
    return this.db.withTenant(organizationId, async (client) => {
      const res = await client.query(
        `INSERT INTO fixed_expenses
           (id, organization_id, category, description, amount, expense_date, registered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          expense.id,
          organizationId,
          expense.category,
          expense.description || null,
          expense.amount,
          expense.expense_date,
          userId,
        ],
      );
      return res.rows[0];
    });
  }
}

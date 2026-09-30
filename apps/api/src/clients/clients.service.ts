import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClientsService {
  constructor(private db: DatabaseService) {}

  /**
   * Get clients with upcoming birthdays (next 3 days).
   * Computed at query time — no pg_cron needed.
   */
  async getBirthdays(organizationId: string, userRole: string) {
    return this.db.withTenant(organizationId, async (client) => {
      const res = await client.query(`
        SELECT id, full_name, phone_whatsapp, birth_date
        FROM clients
        WHERE deleted_at IS NULL
          AND birth_date IS NOT NULL
          AND (EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date))
          IN (
            SELECT EXTRACT(MONTH FROM d), EXTRACT(DAY FROM d)
            FROM generate_series(
              CURRENT_DATE,
              CURRENT_DATE + INTERVAL '3 days',
              '1 day'
            ) d
          )
        ORDER BY
          (EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date))
          = (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE)) DESC
      `);
      // RLS handles org filtering — no need for explicit WHERE org_id = $1

      let clients = res.rows;
      if (userRole === 'EMPLOYEE') {
        clients = clients.map((doc) => ({
          ...doc,
          phone_whatsapp: doc.phone_whatsapp
            ? `***${doc.phone_whatsapp.slice(-3)}`
            : null,
        }));
      }
      return clients;
    });
  }

  /**
   * Create a client with consent tracking (LOPDP).
   */
  async createClient(
    organizationId: string,
    data: {
      id: string;
      full_name: string;
      phone_whatsapp?: string | null;
      birth_date?: string | null;
      consent_given_at?: string | null;
    },
  ) {
    return this.db.withTenant(organizationId, async (client) => {
      const res = await client.query(
        `INSERT INTO clients
           (id, organization_id, full_name, phone_whatsapp, birth_date, consent_given_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          data.id,
          organizationId,
          data.full_name,
          data.phone_whatsapp || null,
          data.birth_date || null,
          data.consent_given_at || null,
        ],
      );
      return res.rows[0];
    });
  }

  /**
   * List all active clients.
   */
  async listClients(organizationId: string, userRole: string) {
    return this.db.withTenant(organizationId, async (client) => {
      const res = await client.query(`
        SELECT * FROM clients
        WHERE deleted_at IS NULL
        ORDER BY full_name ASC
      `);

      let clients = res.rows;
      if (userRole === 'EMPLOYEE') {
        clients = clients.map((doc) => ({
          ...doc,
          phone_whatsapp: doc.phone_whatsapp
            ? `***${doc.phone_whatsapp.slice(-3)}`
            : null,
        }));
      }
      return clients;
    });
  }
}

import { Pool } from 'pg';
import { DatabaseService } from '../src/database/database.service';
import { SalesService } from '../src/sales/sales.service';
import { SyncService } from '../src/sync/sync.service';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Suite de Pruebas de Aislamiento RLS Multi-Tenant (Tenant A vs Tenant B).
 *
 * Criterio de aceptación explícito:
 * Demostrar que un usuario/sesión autenticado como Organización A:
 *  1. NO puede leer registros de la Organización B (retorna 0 filas).
 *  2. NO puede actualizar registros de la Organización B (0 filas afectadas).
 *  3. NO puede borrar registros de la Organización B (0 filas afectadas).
 *  4. NO puede insertar registros asignados a la Organización B (violación de WITH CHECK).
 *  5. La conexión reciclada del pool no fuga 'app.current_organization_id'.
 *  6. La lógica de negocio (SalesService, SyncService) respeta el aislamiento.
 *  7. Guardrail CI: Ninguna tabla con organization_id puede existir sin RLS activo.
 *  8. Capa 2: La conexión puede asumir glamos_app sin error de privilegios.
 *
 * NOTA CRÍTICA DE CI: Esta suite NUNCA se salta (.skip). Si DATABASE_URL no está
 * configurada o la conexión a Postgres falla, revienta inmediatamente con error FATAL.
 */
describe('Multi-Tenant RLS Isolation (Tenant A vs Tenant B)', () => {
  let pool: Pool;
  let ownerPool: Pool;
  let dbService: DatabaseService;
  let salesService: SalesService;
  let syncService: SyncService;

  const orgAId = crypto.randomUUID();
  const orgBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();

  // IDs para entidades creadas en cada tenant
  const clientAId = crypto.randomUUID();
  const clientBId = crypto.randomUUID();
  const saleAId = crypto.randomUUID();
  const saleBId = crypto.randomUUID();
  const productAId = crypto.randomUUID();
  const productBId = crypto.randomUUID();

  const databaseUrl = process.env.DATABASE_URL;
  const migrationUrl = process.env.MIGRATION_DATABASE_URL;

  beforeAll(async () => {
    // FALLA FUERTE: Si falta DATABASE_URL o MIGRATION_DATABASE_URL, la suite explota con error.
    if (!databaseUrl || !migrationUrl) {
      throw new Error(
        '\n========================================================================\n' +
        'FATAL: Faltan variables de entorno requeridas para la suite de integración.\n' +
        `  - DATABASE_URL: ${databaseUrl ? 'CONFIGURADA' : 'FALTANTE (debe conectar como glamos_app)'}\n` +
        `  - MIGRATION_DATABASE_URL: ${migrationUrl ? 'CONFIGURADA' : 'FALTANTE (debe conectar como dueño/neondb_owner)'}\n` +
        'Esta suite (rls-isolation.spec.ts) es la prueba de seguridad multi-tenant\n' +
        'y guardrail de CI. Requiere AMBAS credenciales y NUNCA DEBE SALTARSE.\n' +
        'Configura ambas en tu entorno o .env para ejecutar las pruebas.\n' +
        '========================================================================\n'
      );
    }

    pool = new Pool({ connectionString: databaseUrl });
    ownerPool = new Pool({ connectionString: migrationUrl });

    // Verificar conexiones de inmediato
    try {
      const probeApp = await pool.connect();
      probeApp.release();
      const probeOwner = await ownerPool.connect();
      probeOwner.release();
    } catch (err: any) {
      throw new Error(
        `FATAL: No se pudo conectar a PostgreSQL: ${err.message}`
      );
    }

    dbService = new DatabaseService();
    // @ts-ignore - inyectamos pool
    dbService['pool'] = pool;

    salesService = new SalesService(dbService);
    syncService = new SyncService(dbService);

    // Setup: Crear organizaciones y usuarios de prueba usando la conexión del dueño
    const admin = await ownerPool.connect();
    try {
      await admin.query('BEGIN');

      // Crear orgs
      await admin.query(
        `INSERT INTO organizations (id, business_name, join_code_hmac)
         VALUES ($1, 'Salon A Test', 'hmac_a'), ($2, 'Salon B Test', 'hmac_b')
         ON CONFLICT (id) DO NOTHING`,
        [orgAId, orgBId]
      );

      // Crear usuarios
      await admin.query(
        `INSERT INTO users (id, organization_id, google_sub, email, full_name, role)
         VALUES
           ($1, $2, $3, 'admin_a@test.com', 'Admin A', 'OWNER_ADMIN'),
           ($4, $5, $6, 'admin_b@test.com', 'Admin B', 'OWNER_ADMIN')
         ON CONFLICT (id) DO NOTHING`,
        [userAId, orgAId, 'google_sub_' + userAId, userBId, orgBId, 'google_sub_' + userBId]
      );

      // Crear clientes de prueba en cada org (con set_config para cumplir WITH CHECK de RLS)
      await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [orgAId]);
      await admin.query(
        `INSERT INTO clients (id, organization_id, full_name, phone_whatsapp)
         VALUES ($1, $2, 'Cliente Org A', '+593999999001')
         ON CONFLICT (id) DO NOTHING`,
        [clientAId, orgAId]
      );

      await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [orgBId]);
      await admin.query(
        `INSERT INTO clients (id, organization_id, full_name, phone_whatsapp)
         VALUES ($1, $2, 'Cliente Org B', '+593999999002')
         ON CONFLICT (id) DO NOTHING`,
        [clientBId, orgBId]
      );

      // Crear productos de prueba en cada org
      await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [orgAId]);
      await admin.query(
        `INSERT INTO products (id, organization_id, name, unit_cost, unit_price, current_stock)
         VALUES ($1, $2, 'Esmalte Org A', 5.0, 10.0, 20)
         ON CONFLICT (id) DO NOTHING`,
        [productAId, orgAId]
      );

      await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [orgBId]);
      await admin.query(
        `INSERT INTO products (id, organization_id, name, unit_cost, unit_price, current_stock)
         VALUES ($1, $2, 'Esmalte Org B', 6.0, 12.0, 15)
         ON CONFLICT (id) DO NOTHING`,
        [productBId, orgBId]
      );

      // Crear ventas de prueba en cada org
      await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [orgAId]);
      await admin.query(
        `INSERT INTO sales (id, organization_id, employee_id, client_id, subtotal, discount_total, final_total, tip_amount, payment_method, status)
         VALUES ($1, $2, $3, $4, 50.0, 0.0, 50.0, 5.0, 'CASH', 'COMPLETED')
         ON CONFLICT (id) DO NOTHING`,
        [saleAId, orgAId, userAId, clientAId]
      );

      await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [orgBId]);
      await admin.query(
        `INSERT INTO sales (id, organization_id, employee_id, client_id, subtotal, discount_total, final_total, tip_amount, payment_method, status)
         VALUES ($1, $2, $3, $4, 100.0, 0.0, 100.0, 10.0, 'TRANSFER', 'COMPLETED')
         ON CONFLICT (id) DO NOTHING`,
        [saleBId, orgBId, userBId, clientBId]
      );

      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK');
      throw e;
    } finally {
      admin.release();
    }
  });

  afterAll(async () => {
    if (ownerPool) {
      const admin = await ownerPool.connect();
      try {
        // Limpieza de datos de prueba con scope por tenant
        for (const org of [orgAId, orgBId]) {
          await admin.query('BEGIN');
          await admin.query("SELECT set_config('app.current_organization_id', $1, true)", [org]);
          await admin.query('DELETE FROM sales WHERE organization_id = $1', [org]);
          await admin.query('DELETE FROM clients WHERE organization_id = $1', [org]);
          await admin.query('DELETE FROM products WHERE organization_id = $1', [org]);
          await admin.query('COMMIT');
        }
        await admin.query('DELETE FROM users WHERE organization_id IN ($1, $2)', [orgAId, orgBId]);
        await admin.query('DELETE FROM organizations WHERE id IN ($1, $2)', [orgAId, orgBId]);
      } finally {
        admin.release();
        await ownerPool.end();
      }
    }
    if (pool) {
      await pool.end();
    }
  });

  describe('1. Verificación de configuración RLS y Guardrails de CI', () => {
    it('el rol glamos_app existe y no tiene permisos de bypass de RLS', async () => {
      const res = await pool.query(
        `SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = 'glamos_app'`
      );
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].rolbypassrls).toBe(false);
      expect(res.rows[0].rolsuper).toBe(false);
    });

    it('Capa 2: un usuario dueño/administrador (ej. neondb_owner) puede degradar privilegios a glamos_app vía SET LOCAL ROLE', async () => {
      const ownerUrl = process.env.MIGRATION_DATABASE_URL;
      if (!ownerUrl) {
        throw new Error(
          'MIGRATION_DATABASE_URL no está definida — esta prueba de Capa 2 requiere credenciales del dueño (no las de glamos_app) para validar la delegación de roles.'
        );
      }
      const ownerPool = new Pool({ connectionString: ownerUrl });
      const client = await ownerPool.connect();
      try {
        await client.query('BEGIN');
        const initialUserRes = await client.query('SELECT current_user, session_user');
        const initialUser = initialUserRes.rows[0].current_user;

        // Aserción incondicional: la conexión dueña no debe ser glamos_app
        expect(initialUser).not.toBe('glamos_app');

        await client.query('SET LOCAL ROLE glamos_app');
        const degradedUserRes = await client.query('SELECT current_user, session_user');
        expect(degradedUserRes.rows[0].current_user).toBe('glamos_app');
        expect(degradedUserRes.rows[0].session_user).toBe(initialUser);

        await client.query('COMMIT');

        // Tras commit, el rol vuelve automáticamente al usuario de sesión original
        const restoredUserRes = await client.query('SELECT current_user');
        expect(restoredUserRes.rows[0].current_user).toBe(initialUser);
      } finally {
        client.release();
        await ownerPool.end();
      }
    });

    it('las tablas críticas tienen FORCE ROW LEVEL SECURITY activado', async () => {
      const res = await pool.query(
        `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
         WHERE relname IN ('sales', 'sale_items', 'clients', 'products', 'stock_movements')`
      );
      expect(res.rows.length).toBeGreaterThanOrEqual(5);
      for (const row of res.rows) {
        expect(row.relrowsecurity).toBe(true);
        expect(row.relforcerowsecurity).toBe(true);
      }
    });

    it('CI Guardrail: TODA tabla con organization_id DEBE tener RLS (relrowsecurity) activado', async () => {
      const res = await pool.query(`
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND EXISTS (
            SELECT 1 FROM information_schema.columns col
            WHERE col.table_name = c.relname AND col.column_name = 'organization_id'
          )
          AND NOT c.relrowsecurity
      `);
      const unshieldedTables = res.rows.map((r: any) => r.relname);
      expect(unshieldedTables).toEqual([]);
    });

    it('CI Guardrail: TODA tabla con organization_id DEBE tener FORCE RLS (relforcerowsecurity) activado', async () => {
      const res = await pool.query(`
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND EXISTS (
            SELECT 1 FROM information_schema.columns col
            WHERE col.table_name = c.relname AND col.column_name = 'organization_id'
          )
          AND NOT c.relforcerowsecurity
      `);
      const nonForcedTables = res.rows.map((r: any) => r.relname);
      expect(nonForcedTables).toEqual([]);
    });
  });

  describe('2. Aislamiento en Lectura (SELECT): Tenant A no ve datos de Tenant B', () => {
    it('Tenant A listando clientes solo obtiene sus propios clientes', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const res = await client.query('SELECT * FROM clients');
        const ids = res.rows.map((r) => r.id);

        expect(ids).toContain(clientAId);
        expect(ids).not.toContain(clientBId);
      });
    });

    it('Tenant A consultando explícitamente por el ID del cliente de Tenant B obtiene 0 filas', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const res = await client.query('SELECT * FROM clients WHERE id = $1', [clientBId]);
        expect(res.rows.length).toBe(0);
      });
    });

    it('Tenant A listando ventas solo ve las ventas de Org A', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const res = await client.query('SELECT * FROM sales');
        const ids = res.rows.map((r) => r.id);

        expect(ids).toContain(saleAId);
        expect(ids).not.toContain(saleBId);
      });
    });

    it('Tenant A consultando explícitamente por el ID de venta de Tenant B obtiene 0 filas', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const res = await client.query('SELECT * FROM sales WHERE id = $1', [saleBId]);
        expect(res.rows.length).toBe(0);
      });
    });

    it('Tenant A listando productos solo ve los de Org A', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const res = await client.query('SELECT * FROM products');
        const ids = res.rows.map((r) => r.id);

        expect(ids).toContain(productAId);
        expect(ids).not.toContain(productBId);
      });
    });
  });

  describe('3. Aislamiento en Modificación (UPDATE y DELETE): Tenant A no puede alterar Tenant B', () => {
    it('Tenant A intentando hacer UPDATE a un cliente de Tenant B afecta 0 filas', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const updateRes = await client.query(
          `UPDATE clients SET full_name = 'HACKEADO' WHERE id = $1`,
          [clientBId]
        );
        expect(updateRes.rowCount).toBe(0);
      });

      // Verificar desde admin que el cliente B permanece intacto
      const checkRes = await ownerPool.query('SELECT full_name FROM clients WHERE id = $1', [clientBId]);
      expect(checkRes.rows[0].full_name).toBe('Cliente Org B');
    });

    it('Tenant A intentando hacer DELETE a una venta de Tenant B afecta 0 filas', async () => {
      await dbService.withTenant(orgAId, async (client) => {
        const deleteRes = await client.query(
          `DELETE FROM sales WHERE id = $1`,
          [saleBId]
        );
        expect(deleteRes.rowCount).toBe(0);
      });

      // Verificar que la venta B sigue existiendo
      const checkRes = await ownerPool.query('SELECT id FROM sales WHERE id = $1', [saleBId]);
      expect(checkRes.rows.length).toBe(1);
    });
  });

  describe('4. Aislamiento en Inserción (INSERT): Prevención de inyección cruzada por WITH CHECK', () => {
    it('Tenant A intentando insertar un cliente con organization_id de Tenant B es rechazado por RLS', async () => {
      await expect(
        dbService.withTenant(orgAId, async (client) => {
          await client.query(
            `INSERT INTO clients (id, organization_id, full_name)
             VALUES ($1, $2, 'Cliente Infiltrado')`,
            [crypto.randomUUID(), orgBId]
          );
        })
      ).rejects.toThrow();
    });
  });

  describe('5. Seguridad en el Pool de Conexiones (Sin fuga de app.current_organization_id)', () => {
    it('una consulta bajo glamos_app sin organization_id devuelve 0 filas por defecto', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE glamos_app');
        const res = await client.query('SELECT * FROM clients');
        expect(res.rows.length).toBe(0);
        await client.query('COMMIT');
      } finally {
        await client.query('RESET ROLE');
        client.release();
      }
    });

    it('después de un ROLLBACK o COMMIT en Tenant A, la conexión reutilizada no conserva orgA', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgAId]);
        await client.query('SET LOCAL ROLE glamos_app');
        const resA = await client.query('SELECT * FROM clients');
        expect(resA.rows.length).toBeGreaterThan(0);
        await client.query('ROLLBACK');

        const settingCheck = await client.query("SELECT current_setting('app.current_organization_id', true) as val");
        expect(settingCheck.rows[0].val == null || settingCheck.rows[0].val === '').toBe(true);
      } finally {
        await client.query('RESET ROLE');
        client.release();
      }
    });
  });

  describe('6. Servicios de la Aplicación respetan el aislamiento de Tenant', () => {
    it('SalesService.voidSale() rechaza anular una venta de otra organización con NotFoundException', async () => {
      await expect(
        salesService.voidSale(orgAId, userAId, saleBId, 'Intento de anulación no autorizada')
      ).rejects.toThrow(NotFoundException);
    });

    it('SyncService.pull() para Tenant A no incluye ningún documento de Tenant B', async () => {
      const result = await syncService.pull(orgAId, 'OWNER_ADMIN', 'sales', null, 100);
      const saleIds = result.documents.map((d: any) => d.id);

      expect(saleIds).toContain(saleAId);
      expect(saleIds).not.toContain(saleBId);
    });

    it('SyncService.push() en Tenant A fuerza la organization_id del tenant autenticado', async () => {
      const spoofedClient = {
        id: crypto.randomUUID(),
        organization_id: orgBId,
        full_name: 'Cliente Spoofed',
      };

      const result = await syncService.push(orgAId, 'clients', [spoofedClient]);
      expect(result.accepted).toContain(spoofedClient.id);

      const res = await ownerPool.query('SELECT organization_id FROM clients WHERE id = $1', [spoofedClient.id]);
      expect(res.rows[0].organization_id).toBe(orgAId);

      await ownerPool.query('DELETE FROM clients WHERE id = $1', [spoofedClient.id]);
    });
  });
});

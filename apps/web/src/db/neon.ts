import { generateUuid, ensureUuid } from '../lib/utils';
import { getDatabase } from './database';

const NEON_CONNECTION_STRING =
  'postgresql://neondb_owner:npg_ftuVJo4Pbk9w@ep-aged-dust-b5283rul.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const NEON_SQL_ENDPOINT = 'https://ep-aged-dust-b5283rul.c-7.us-east-2.aws.neon.tech/sql';

/**
 * Ejecuta una consulta SQL directamente en la base de datos central Neon (PostgreSQL)
 * a través del endpoint HTTP serverless nativo, funcionando desde cualquier teléfono o PC en el mundo.
 */
export async function executeNeonSql<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const res = await fetch(NEON_SQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': NEON_CONNECTION_STRING,
    },
    body: JSON.stringify({ query, params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Neon SQL error: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.rows || []) as T[];
}

export interface NeonUserSession {
  id: string;
  email: string;
  full_name: string;
  role: 'OWNER_ADMIN' | 'EMPLOYEE';
  organization_id: string;
  business_name: string;
}

/**
 * Vincula la cuenta de Google con la base de datos central en Neon.
 * Si la cuenta ya tiene un salón creado (en PC o teléfono), lo carga inmediatamente
 * con su ID y nombre para que jamás aparezca la pantalla de "crear nuevo salón" repetida.
 */
export async function syncGoogleUserWithNeon(googleUser: {
  email: string;
  sub?: string;
  name?: string;
}): Promise<NeonUserSession> {
  const email = (googleUser.email || '').trim().toLowerCase();
  const sub = googleUser.sub || `google_${email}`;
  const fullName = googleUser.name || email.split('@')[0] || 'Usuario GlamOS';

  try {
    // 1. Buscar si el usuario ya existe en Neon por correo o sub
    const existingUsers = await executeNeonSql<any>(
      `SELECT u.id, u.email, u.full_name, u.role, u.organization_id, o.business_name, o.id as org_id
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE LOWER(u.email) = LOWER($1) OR (u.google_sub IS NOT NULL AND u.google_sub = $2)
       LIMIT 1`,
      [email, sub]
    );

    if (existingUsers.length > 0 && existingUsers[0].organization_id) {
      const u = existingUsers[0];
      // Si el salón existe en la base de datos central, asegurar que el usuario esté actualizado
      await executeNeonSql(
        `UPDATE users SET google_sub = $1, full_name = $2, updated_at = NOW() WHERE id = $3`,
        [sub, fullName, u.id]
      ).catch(() => {});

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name || fullName,
        role: u.role || 'OWNER_ADMIN',
        organization_id: u.organization_id,
        business_name: u.business_name || 'Salón GlamOS Principal',
      };
    }

    // 2. Si es un nuevo usuario o inicia sesión desde otro dispositivo (teléfono),
    // verificar si ya existe alguna organización registrada en el sistema para vincularla
    let orgId = '';
    let orgName = localStorage.getItem('glamos_local_org_name') || 'Salón GlamOS Principal';
    let joinCode = localStorage.getItem('glamos_local_join_code') || 'GLAM-7721-V';

    const existingOrgs = await executeNeonSql<any>(
      `SELECT * FROM organizations ORDER BY created_at ASC LIMIT 1`
    );

    if (existingOrgs.length > 0) {
      // Reutilizar la organización existente: ambos dispositivos (PC y Teléfono) compartirán el mismo salón
      orgId = existingOrgs[0].id;
      orgName = existingOrgs[0].business_name || orgName;
    } else {
      // Si es el primer salón, crear la organización central
      const localOrg = localStorage.getItem('glamos_local_org_id') || localStorage.getItem(`glamos_user_org_${email}`);
      orgId = localOrg ? ensureUuid(localOrg) : '00000000-0000-4000-a000-000000000001';

      await executeNeonSql(
        `INSERT INTO organizations (id, business_name, join_code_hmac, join_code_expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '10 years', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name, updated_at = NOW()`,
        [orgId, orgName, joinCode]
      );
    }

    // 3. Insertar o actualizar el usuario en Neon vinculado a esta organización
    const userId = ensureUuid(sub && sub.length >= 32 ? sub : generateUuid());
    await executeNeonSql(
      `INSERT INTO users (id, google_sub, email, full_name, role, organization_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'OWNER_ADMIN', $5, true, NOW(), NOW())
       ON CONFLICT (google_sub) DO UPDATE 
       SET organization_id = EXCLUDED.organization_id, email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW()`,
      [userId, sub, email, fullName, orgId]
    ).catch(async () => {
      await executeNeonSql(
        `UPDATE users SET organization_id = $1, full_name = $2, role = 'OWNER_ADMIN', updated_at = NOW() WHERE LOWER(email) = LOWER($3)`,
        [orgId, fullName, email]
      );
    });

    return {
      id: userId,
      email,
      full_name: fullName,
      role: 'OWNER_ADMIN',
      organization_id: orgId,
      business_name: orgName,
    };
  } catch (err) {
    console.warn('Advertencia en syncGoogleUserWithNeon (Modo Local Fallback):', err);
    const fallbackOrgId = localStorage.getItem('glamos_local_org_id') || '00000000-0000-4000-a000-000000000001';
    const fallbackOrgName = localStorage.getItem('glamos_local_org_name') || 'Salón GlamOS Principal';
    return {
      id: generateUuid(),
      email,
      full_name: fullName,
      role: 'OWNER_ADMIN',
      organization_id: fallbackOrgId,
      business_name: fallbackOrgName,
    };
  }
}

/**
 * Descarga y sincroniza todos los productos, servicios, ventas, clientes y gastos
 * desde Neon hacia el dispositivo local (celular o computador).
 */
export async function pullAllDataFromNeon(organizationId: string): Promise<void> {
  const orgId = ensureUuid(organizationId);

  try {
    // 1. Clientes
    const clients = await executeNeonSql(
      `SELECT * FROM clients WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
      [orgId]
    );
    if (clients.length > 0 || !localStorage.getItem('glamos_local_clients')) {
      localStorage.setItem('glamos_local_clients', JSON.stringify(clients));
      window.dispatchEvent(new Event('glamos_updated_clients'));
    }

    // 2. Servicios
    const services = await executeNeonSql(
      `SELECT * FROM services WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
      [orgId]
    );
    if (services.length > 0 || !localStorage.getItem('glamos_local_services')) {
      localStorage.setItem('glamos_local_services', JSON.stringify(services));
      window.dispatchEvent(new Event('glamos_updated_services'));
    }

    // 3. Productos
    const products = await executeNeonSql(
      `SELECT * FROM products WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
      [orgId]
    );
    if (products.length > 0 || !localStorage.getItem('glamos_local_products')) {
      localStorage.setItem('glamos_local_products', JSON.stringify(products));
      window.dispatchEvent(new Event('glamos_updated_products'));
    }

    // 4. Ventas
    const sales = await executeNeonSql(
      `SELECT * FROM sales WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 500`,
      [orgId]
    );
    if (sales.length > 0 || !localStorage.getItem('glamos_local_sales')) {
      localStorage.setItem('glamos_local_sales', JSON.stringify(sales));
      window.dispatchEvent(new Event('glamos_updated_sales'));
    }

    // 5. Items de Ventas
    const saleItems = await executeNeonSql(
      `SELECT * FROM sale_items WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1500`,
      [orgId]
    );
    if (saleItems.length > 0) {
      localStorage.setItem('glamos_local_sale_items', JSON.stringify(saleItems));
      window.dispatchEvent(new Event('glamos_updated_sale_items'));
    }

    // 6. Gastos Fijos
    const expenses = await executeNeonSql(
      `SELECT * FROM fixed_expenses WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY expense_date DESC`,
      [orgId]
    );
    if (expenses.length > 0 || !localStorage.getItem('glamos_local_fixed_expenses')) {
      localStorage.setItem('glamos_local_fixed_expenses', JSON.stringify(expenses));
      window.dispatchEvent(new Event('glamos_updated_fixed_expenses'));
    }

    // Replicar también en RxDB / IndexedDB local para búsquedas ultra rápidas
    try {
      const db = await getDatabase();
      if (db) {
        if (db.clients && clients.length > 0) await db.clients.bulkUpsert(clients);
        if (db.services && services.length > 0) await db.services.bulkUpsert(services);
        if (db.products && products.length > 0) await db.products.bulkUpsert(products);
        if (db.sales && sales.length > 0) await db.sales.bulkUpsert(sales);
        if (db.sale_items && saleItems.length > 0) await db.sale_items.bulkUpsert(saleItems);
        if (db.fixed_expenses && expenses.length > 0) await db.fixed_expenses.bulkUpsert(expenses);
      }
    } catch (dbErr) {
      console.warn('Aviso guardando en RxDB local:', dbErr);
    }
  } catch (err) {
    console.warn('Error en pullAllDataFromNeon:', err);
  }
}

/**
 * Sube a Neon cualquier dato que se haya creado localmente en la PC o teléfono
 * para asegurar que ambos dispositivos tengan exactamente la misma información.
 * Lee tanto de RxDB (IndexedDB) como de localStorage para máxima resiliencia.
 */
export async function uploadLocalDataToNeon(organizationId: string): Promise<void> {
  const orgId = ensureUuid(organizationId);
  const orgName = localStorage.getItem('glamos_local_org_name') || 'Salón GlamOS Principal';
  const joinCode = localStorage.getItem('glamos_local_join_code') || 'GLAM-7721-V';

  try {
    // 0. Asegurar que la Organización exista en Neon para que las claves foráneas no reboten
    await executeNeonSql(
      `INSERT INTO organizations (id, business_name, join_code_hmac, join_code_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 years', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name, updated_at = NOW()`,
      [orgId, orgName, joinCode]
    );

    // 0.1 Asegurar que el usuario activo de la sesión esté registrado en Neon
    let activeUserId = '00000000-0000-4000-a000-000000000002';
    const storedTokens = localStorage.getItem('glamos_tokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        const parts = parsed.access_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.email) {
            const email = payload.email.trim().toLowerCase();
            const sub = payload.sub || `google_${email}`;
            const fullName = localStorage.getItem(`glamos_user_name_${email}`) || localStorage.getItem('glamos_user_display_name') || email.split('@')[0];
            const role = payload.role || 'OWNER_ADMIN';
            activeUserId = ensureUuid(payload.sub && payload.sub.length >= 32 ? payload.sub : generateUuid());

            await executeNeonSql(
              `INSERT INTO users (id, google_sub, email, full_name, role, organization_id, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'OWNER_ADMIN', $5, true, NOW(), NOW())
               ON CONFLICT (google_sub) DO UPDATE 
               SET organization_id = EXCLUDED.organization_id, email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW()`,
              [activeUserId, sub, email, fullName, orgId]
            ).catch(async () => {
              await executeNeonSql(
                `UPDATE users SET organization_id = $1, role = $2, updated_at = NOW() WHERE LOWER(email) = LOWER($3)`,
                [orgId, role, email]
              );
            });
          }
        }
      } catch (uErr) {
        console.warn('Aviso sincronizando usuario activo en Neon:', uErr);
      }
    }

    // Obtener instancia de base de datos local RxDB
    const db = await getDatabase().catch(() => null);

    // Función auxiliar para extraer registros combinados de RxDB y LocalStorage
    const getCombinedRecords = async (tableName: string): Promise<any[]> => {
      let records: any[] = [];
      if (db && (db as any)[tableName]) {
        try {
          const docs = await (db as any)[tableName].find().exec();
          records = docs.map((d: any) => d.toJSON());
        } catch {}
      }
      const localStr = localStorage.getItem(`glamos_local_${tableName}`);
      if (localStr) {
        try {
          const list = JSON.parse(localStr);
          const map = new Map<string, any>();
          records.forEach((r) => map.set(r.id, r));
          if (Array.isArray(list)) {
            list.forEach((r: any) => {
              if (r?.id && !map.has(r.id)) map.set(r.id, r);
            });
          }
          records = Array.from(map.values());
        } catch {}
      }
      return records;
    };

    // 1. Subir Clientes locales
    const localClients = await getCombinedRecords('clients');
    const validClientIds = new Set<string>();
    for (const c of localClients) {
      if (!c.id) continue;
      const cId = ensureUuid(c.id);
      validClientIds.add(cId);
      await executeNeonSql(
        `INSERT INTO clients (id, organization_id, full_name, phone_whatsapp, birth_date, consent_given_at, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone_whatsapp = EXCLUDED.phone_whatsapp, birth_date = EXCLUDED.birth_date, updated_at = NOW()`,
        [
          cId,
          orgId,
          c.full_name || c.name || 'Cliente VIP',
          c.phone_whatsapp || c.phone || null,
          c.birth_date || null,
          c.consent_given_at || new Date().toISOString(),
          c.created_at || new Date().toISOString(),
          c.updated_at || new Date().toISOString(),
          c.deleted_at || null,
        ]
      ).catch(() => {});
    }

    // 2. Subir Servicios locales
    const localServices = await getCombinedRecords('services');
    for (const s of localServices) {
      if (!s.id) continue;
      await executeNeonSql(
        `INSERT INTO services (id, organization_id, name, base_price, active_discount_percentage, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price, updated_at = NOW()`,
        [
          ensureUuid(s.id),
          orgId,
          s.name,
          s.base_price || 0,
          s.active_discount_percentage || 0,
          s.created_at || new Date().toISOString(),
          s.updated_at || new Date().toISOString(),
          s.deleted_at || null,
        ]
      ).catch(() => {});
    }

    // 3. Subir Productos locales
    const localProducts = await getCombinedRecords('products');
    for (const p of localProducts) {
      if (!p.id) continue;
      await executeNeonSql(
        `INSERT INTO products (id, organization_id, name, sku, unit_cost, unit_price, current_stock, min_stock_alert, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, current_stock = EXCLUDED.current_stock, unit_price = EXCLUDED.unit_price, updated_at = NOW()`,
        [
          ensureUuid(p.id),
          orgId,
          p.name,
          p.sku || null,
          p.unit_cost || 0,
          p.unit_price || 0,
          p.current_stock ?? 10,
          p.min_stock_alert ?? 5,
          p.created_at || new Date().toISOString(),
          p.updated_at || new Date().toISOString(),
          p.deleted_at || null,
        ]
      ).catch(() => {});
    }

    // 4. Subir Ventas locales
    const localSales = await getCombinedRecords('sales');
    for (const sale of localSales) {
      if (!sale.id) continue;
      // Validar client_id foráneo para no rebotar
      const cId = sale.client_id && validClientIds.has(ensureUuid(sale.client_id))
        ? ensureUuid(sale.client_id)
        : null;

      const paymentMethod = ['CASH', 'TRANSFER', 'MIXED'].includes(sale.payment_method)
        ? sale.payment_method
        : 'CASH';

      const status = ['COMPLETED', 'VOIDED'].includes(sale.status)
        ? sale.status
        : 'COMPLETED';

      await executeNeonSql(
        `INSERT INTO sales (id, organization_id, employee_id, client_id, subtotal, discount_total, final_total, tip_amount, payment_method, cash_amount, transfer_amount, status, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET final_total = EXCLUDED.final_total, status = EXCLUDED.status, updated_at = NOW()`,
        [
          ensureUuid(sale.id),
          orgId,
          sale.employee_id ? ensureUuid(sale.employee_id) : activeUserId,
          cId,
          sale.subtotal || sale.final_total || 0,
          sale.discount_total || 0,
          sale.final_total || 0,
          sale.tip_amount || 0,
          paymentMethod,
          sale.cash_amount || 0,
          sale.transfer_amount || 0,
          status,
          sale.created_at || new Date().toISOString(),
          sale.updated_at || new Date().toISOString(),
          sale.deleted_at || null,
        ]
      ).catch(() => {});
    }

    // 5. Subir Items de Ventas
    const localSaleItems = await getCombinedRecords('sale_items');
    for (const item of localSaleItems) {
      if (!item.id || !item.sale_id) continue;
      await executeNeonSql(
        `INSERT INTO sale_items (id, sale_id, organization_id, service_id, product_id, quantity, unit_price, discount_percentage, line_total, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity, line_total = EXCLUDED.line_total, updated_at = NOW()`,
        [
          ensureUuid(item.id),
          ensureUuid(item.sale_id),
          orgId,
          item.service_id ? ensureUuid(item.service_id) : null,
          item.product_id ? ensureUuid(item.product_id) : null,
          item.quantity || 1,
          item.unit_price || 0,
          item.discount_percentage || 0,
          item.line_total || 0,
          item.created_at || new Date().toISOString(),
          item.updated_at || new Date().toISOString(),
        ]
      ).catch(() => {});
    }

    // 6. Subir Gastos Fijos locales
    const localExpenses = await getCombinedRecords('fixed_expenses');
    const validExpenseCategories = ['RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MARKETING', 'OTHER'];
    for (const exp of localExpenses) {
      if (!exp.id) continue;
      const cat = validExpenseCategories.includes(exp.category) ? exp.category : 'OTHER';
      const expenseDate = exp.expense_date
        ? String(exp.expense_date).split('T')[0]
        : new Date().toISOString().split('T')[0];

      await executeNeonSql(
        `INSERT INTO fixed_expenses (id, organization_id, category, description, amount, expense_date, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = NOW()`,
        [
          ensureUuid(exp.id),
          orgId,
          cat,
          exp.description || 'Gasto Operativo',
          exp.amount || 0,
          expenseDate,
          exp.created_at || new Date().toISOString(),
          exp.updated_at || new Date().toISOString(),
          exp.deleted_at || null,
        ]
      ).catch(() => {});
    }
  } catch (err) {
    console.warn('Aviso en uploadLocalDataToNeon:', err);
  }
}

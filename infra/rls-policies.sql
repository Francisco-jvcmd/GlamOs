-- ============================================================
-- GlamOS — Row-Level Security (RLS)
--
-- Requisitos para que RLS funcione de verdad:
--   1. Rol de aplicación (glamos_app) que NO es dueño de tablas
--   2. FORCE ROW LEVEL SECURITY en cada tabla
--   3. SET LOCAL dentro de transacción en el interceptor NestJS
-- ============================================================

-- ── Rol de aplicación ──────────────────────────────────────
-- En Neon, el rol dueño es el que crea las tablas.
-- Las queries de la app se ejecutan bajo glamos_app, que no
-- tiene BYPASSRLS.
DO $$
BEGIN
  CREATE ROLE glamos_app WITH LOGIN;
EXCEPTION
  WHEN duplicate_object THEN
    ALTER ROLE glamos_app WITH LOGIN;
END $$;

-- Membresía explícita: garantiza que el usuario dueño (neondb_owner) tenga permiso para hacer SET LOCAL ROLE glamos_app
GRANT glamos_app TO CURRENT_USER;

GRANT USAGE ON SCHEMA public TO glamos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO glamos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO glamos_app;

-- ── Habilitar y forzar RLS en tablas multi-tenant ──────────
-- FORCE asegura que incluso el dueño de la tabla está sujeto
-- a las políticas (a menos que tenga BYPASSRLS explícito).
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'clients', 'services', 'products',
      'sales', 'sale_items', 'stock_movements',
      'fixed_expenses', 'commission_rules', 'salary_advances',
      'ai_provider_connections', 'ai_generation_log'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%s ON %I
       USING (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)
       WITH CHECK (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ── audit_logs: append-only para glamos_app ────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Solo INSERT, nunca UPDATE/DELETE
REVOKE UPDATE, DELETE ON audit_logs FROM glamos_app;

-- ── refresh_tokens: aislado por user, no por org ───────────
-- No necesita RLS multi-tenant; se filtra por user_id en código.
-- Revocar DELETE directo para forzar soft-revoke.
REVOKE DELETE ON refresh_tokens FROM glamos_app;

-- ============================================================
-- USO EN EL INTERCEPTOR (NestJS):
--
--   await client.query('BEGIN');
--   await client.query(
--     "SELECT set_config('app.current_organization_id', $1, true)",
--     [organizationId]
--   );
--   // ... ejecutar queries de la request ...
--   await client.query('COMMIT');
--
-- El tercer argumento `true` en set_config hace que sea LOCAL
-- a la transacción — no se filtra a otra request en la misma
-- conexión pooled.
-- ============================================================

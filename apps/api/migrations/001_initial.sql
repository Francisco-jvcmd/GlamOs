-- ============================================================
-- Migration: 001_initial.sql
-- GlamOS Schema Completo + Políticas de Seguridad RLS
-- ============================================================

-- ── Extensiones ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Organizations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(120) NOT NULL,
  join_code_hmac  VARCHAR(128) NOT NULL UNIQUE,
  join_code_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Users ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('OWNER_ADMIN', 'EMPLOYEE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub      VARCHAR(255) UNIQUE NOT NULL,
  email           VARCHAR(255) NOT NULL,
  full_name       VARCHAR(120),
  role            user_role NOT NULL DEFAULT 'EMPLOYEE',
  organization_id UUID REFERENCES organizations(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Clients ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name       VARCHAR(120) NOT NULL,
  phone_whatsapp  VARCHAR(20),
  birth_date      DATE,
  consent_given_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ── 4. Services ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            VARCHAR(120) NOT NULL,
  base_price      NUMERIC(10,2) NOT NULL,
  active_discount_percentage INT DEFAULT 0
    CHECK (active_discount_percentage BETWEEN 0 AND 100),
  discount_starts_at TIMESTAMPTZ,
  discount_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ── 5. Products ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            VARCHAR(120) NOT NULL,
  sku             VARCHAR(60),
  unit_cost       NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_stock   INT NOT NULL DEFAULT 0,
  min_stock_alert INT DEFAULT 5,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ── 6. Sales ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CASH', 'TRANSFER', 'MIXED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('COMPLETED', 'VOIDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS sales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  employee_id         UUID NOT NULL REFERENCES users(id),
  client_id           UUID REFERENCES clients(id),
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_total      NUMERIC(10,2) DEFAULT 0,
  final_total         NUMERIC(10,2) NOT NULL,
  tip_amount          NUMERIC(10,2) DEFAULT 0,
  payment_method      payment_method NOT NULL,
  cash_amount         NUMERIC(10,2),
  transfer_amount     NUMERIC(10,2),
  transfer_receipt_key TEXT,
  status              sale_status DEFAULT 'COMPLETED',
  voided_at           TIMESTAMPTZ,
  voided_by           UUID REFERENCES users(id),
  void_reason         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- ── 7. Sale Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  service_id      UUID REFERENCES services(id),
  product_id      UUID REFERENCES products(id),
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL,
  discount_percentage INT DEFAULT 0
    CHECK (discount_percentage BETWEEN 0 AND 100),
  line_total      NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_item_type CHECK (
    service_id IS NOT NULL OR product_id IS NOT NULL
  )
);

-- ── 8. Stock Movements ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  delta           INT NOT NULL,
  reason          VARCHAR(60) NOT NULL,
  reference_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 9. Fixed Expenses ───────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MARKETING', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category        expense_category NOT NULL,
  description     VARCHAR(200),
  amount          NUMERIC(10,2) NOT NULL,
  expense_date    DATE NOT NULL,
  registered_by   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ── 10. Commission Rules ────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id     UUID REFERENCES users(id),
  service_id      UUID REFERENCES services(id),
  percentage      NUMERIC(5,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ── 11. Salary Advances ────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_advances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id     UUID NOT NULL REFERENCES users(id),
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note            VARCHAR(200),
  advance_date    DATE NOT NULL,
  registered_by   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 12. AI Provider Connections ────────────────────────────
DO $$ BEGIN
  CREATE TYPE ai_provider AS ENUM (
    'HOUSE_FREE', 'BYOK_FLUX', 'BYOK_STABILITY', 'BYOK_HUGGINGFACE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS ai_provider_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider        ai_provider NOT NULL,
  api_key_encrypted TEXT,
  monthly_quota   INT NOT NULL DEFAULT 15,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 13. AI Generation Log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_generation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider_used   VARCHAR(30),
  month_bucket    DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 14. Refresh Tokens ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 15. Audit Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  actor_id        UUID NOT NULL,
  action          VARCHAR(60) NOT NULL,
  entity          VARCHAR(60) NOT NULL,
  entity_id       UUID NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_org_created    ON sales(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_org_employee   ON sales(organization_id, employee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale      ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clients_org_bday     ON clients(organization_id, birth_date);
CREATE INDEX IF NOT EXISTS idx_audit_org_entity     ON audit_logs(organization_id, entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user         ON refresh_tokens(user_id, revoked);

CREATE INDEX IF NOT EXISTS idx_sales_sync      ON sales(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_services_sync   ON services(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_products_sync   ON products(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_clients_sync    ON clients(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sync ON sale_items(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_stock_mvts_sync ON stock_movements(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_expenses_sync   ON fixed_expenses(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_commission_sync ON commission_rules(organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_advances_sync   ON salary_advances(organization_id, updated_at, id);

-- ── Trigger Function: set_updated_at ───────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'organizations', 'users', 'clients', 'services', 'products',
      'sales', 'sale_items', 'stock_movements', 'fixed_expenses',
      'commission_rules', 'salary_advances',
      'ai_provider_connections'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_updated_at_' || tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- Políticas de Seguridad RLS
-- ============================================================

-- 1. Rol de aplicación (sin contraseña hardcodeada en el DDL versionado)
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

-- 2. Habilitar y forzar RLS en tablas multi-tenant
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

    -- Evitar error si ya existe la política
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'tenant_isolation_' || tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation_%s ON %I
         USING (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)
         WITH CHECK (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- 3. audit_logs: append-only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs'
  ) THEN
    CREATE POLICY tenant_isolation_audit_logs ON audit_logs
      USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
  END IF;
END $$;

REVOKE UPDATE, DELETE ON audit_logs FROM glamos_app;
REVOKE DELETE ON refresh_tokens FROM glamos_app;

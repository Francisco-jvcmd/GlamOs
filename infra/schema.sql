-- ============================================================
-- GlamOS — DDL completo (v2 corregido)
-- Orden de creación resuelve todas las dependencias de FK.
-- Toda tabla sincronizable tiene updated_at + deleted_at.
-- ============================================================

-- ── Extensiones ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── 1. Organizations ────────────────────────────────────────
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(120) NOT NULL,
  -- HMAC-SHA256 con pepper del servidor; buscable con índice UNIQUE
  join_code_hmac  VARCHAR(128) NOT NULL UNIQUE,
  join_code_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Users ────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('OWNER_ADMIN', 'EMPLOYEE');

CREATE TABLE users (
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
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name       VARCHAR(120) NOT NULL,
  phone_whatsapp  VARCHAR(20),
  birth_date      DATE,
  consent_given_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ           -- soft-delete para sync
);

-- ── 4. Services ─────────────────────────────────────────────
CREATE TABLE services (
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
CREATE TABLE products (
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
CREATE TYPE payment_method AS ENUM ('CASH', 'TRANSFER', 'MIXED');
CREATE TYPE sale_status     AS ENUM ('COMPLETED', 'VOIDED');

CREATE TABLE sales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  employee_id         UUID NOT NULL REFERENCES users(id),
  client_id           UUID REFERENCES clients(id),
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_total      NUMERIC(10,2) DEFAULT 0,
  final_total         NUMERIC(10,2) NOT NULL,
  tip_amount          NUMERIC(10,2) DEFAULT 0,
  payment_method      payment_method NOT NULL,
  cash_amount         NUMERIC(10,2),      -- para pagos MIXED
  transfer_amount     NUMERIC(10,2),      -- para pagos MIXED
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
CREATE TABLE sale_items (
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

-- ── 8. Stock Movements (insert-only, nunca UPDATE/DELETE) ──
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  delta           INT NOT NULL,           -- +entrada, -salida
  reason          VARCHAR(60) NOT NULL,   -- SALE, VOID_REVERSAL, MANUAL_ADJUST, PURCHASE
  reference_id    UUID,                   -- FK lógica a sale_id u otro
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 9. Fixed Expenses ───────────────────────────────────────
CREATE TYPE expense_category AS ENUM (
  'RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MARKETING', 'OTHER'
);

CREATE TABLE fixed_expenses (
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
CREATE TABLE commission_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id     UUID REFERENCES users(id),   -- NULL = todos
  service_id      UUID REFERENCES services(id), -- NULL = todos
  percentage      NUMERIC(5,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ── 11. Salary Advances ────────────────────────────────────
CREATE TABLE salary_advances (
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
CREATE TYPE ai_provider AS ENUM (
  'HOUSE_FREE', 'BYOK_FLUX', 'BYOK_STABILITY', 'BYOK_HUGGINGFACE'
);

CREATE TABLE ai_provider_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider        ai_provider NOT NULL,
  api_key_encrypted TEXT,                  -- AES-256-GCM
  monthly_quota   INT NOT NULL DEFAULT 15,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 13. AI Generation Log ──────────────────────────────────
CREATE TABLE ai_generation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider_used   VARCHAR(30),
  month_bucket    DATE NOT NULL,           -- primer día del mes
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 14. Refresh Tokens ─────────────────────────────────────
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 15. Audit Logs (append-only) ───────────────────────────
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  actor_id        UUID NOT NULL,
  action          VARCHAR(60) NOT NULL,
  entity          VARCHAR(60) NOT NULL,
  entity_id       UUID NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Índices clave ──────────────────────────────────────────
CREATE INDEX idx_sales_org_created    ON sales(organization_id, created_at);
CREATE INDEX idx_sales_org_employee   ON sales(organization_id, employee_id, created_at);
CREATE INDEX idx_sale_items_sale      ON sale_items(sale_id);
CREATE INDEX idx_stock_movements_prod ON stock_movements(product_id, created_at);
CREATE INDEX idx_clients_org_bday     ON clients(organization_id, birth_date);
CREATE INDEX idx_audit_org_entity     ON audit_logs(organization_id, entity, entity_id);
CREATE INDEX idx_refresh_user         ON refresh_tokens(user_id, revoked);

-- Índices para sync incremental (pull por checkpoint)
CREATE INDEX idx_sales_sync      ON sales(organization_id, updated_at, id);
CREATE INDEX idx_services_sync   ON services(organization_id, updated_at, id);
CREATE INDEX idx_products_sync   ON products(organization_id, updated_at, id);
CREATE INDEX idx_clients_sync    ON clients(organization_id, updated_at, id);
CREATE INDEX idx_sale_items_sync ON sale_items(organization_id, updated_at, id);
CREATE INDEX idx_stock_mvts_sync ON stock_movements(organization_id, updated_at, id);
CREATE INDEX idx_expenses_sync   ON fixed_expenses(organization_id, updated_at, id);
CREATE INDEX idx_commission_sync ON commission_rules(organization_id, updated_at, id);
CREATE INDEX idx_advances_sync   ON salary_advances(organization_id, updated_at, id);

-- ── Trigger: auto-actualizar updated_at ────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas sincronizables
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
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

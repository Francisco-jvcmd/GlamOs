-- ============================================================
-- GlamOS — Seed data para desarrollo
-- ============================================================

-- Organización de prueba
INSERT INTO organizations (id, business_name, join_code_hmac, join_code_expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Salón Glamour Demo',
  'seed-hmac-placeholder-replace-in-dev',
  now() + INTERVAL '30 days'
);

-- Usuario admin (google_sub placeholder)
INSERT INTO users (id, google_sub, email, full_name, role, organization_id)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'google-sub-admin-seed',
  'admin@demo.glamos.app',
  'Ana García (Admin)',
  'OWNER_ADMIN',
  '00000000-0000-0000-0000-000000000001'
);

-- Usuario empleado
INSERT INTO users (id, google_sub, email, full_name, role, organization_id)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'google-sub-employee-seed',
  'maria@demo.glamos.app',
  'María López',
  'EMPLOYEE',
  '00000000-0000-0000-0000-000000000001'
);

-- Servicios
INSERT INTO services (id, organization_id, name, base_price) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Manicure básica',     15.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Manicure semi',       25.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Pedicure básica',     18.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Uñas acrílicas',      35.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Diseño artístico',    12.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Retiro de acrílico',   8.00);

-- Productos
INSERT INTO products (id, organization_id, name, sku, unit_cost, unit_price, current_stock) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Esmalte OPI #R01',     'OPI-R01',  5.00,  0.00, 20),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Acrílico polvo 1oz',   'ACR-001',  8.00,  0.00, 15),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Gel UV clear 30ml',    'GEL-030',  6.50,  0.00, 10),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Lima 100/180',         'LIM-100',  0.50,  0.00, 100);

-- Clientes
INSERT INTO clients (id, organization_id, full_name, phone_whatsapp, birth_date, consent_given_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Laura Martínez',  '+593991234567', '1992-03-15', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Carmen Ruiz',     '+593997654321', '1988-10-01', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Sofia Andrade',   '+593998887766', '1995-09-30', now());

-- Regla de comisión por defecto: 30% para todos los empleados en todos los servicios
INSERT INTO commission_rules (organization_id, percentage)
VALUES ('00000000-0000-0000-0000-000000000001', 30.00);

// ============================================================
// GlamOS — Tipos compartidos
// ============================================================

import type {
  UserRole,
  PaymentMethod,
  SaleStatus,
  ExpenseCategory,
  AiProvider,
  StockMovementReason,
} from './enums.js';

// ── Entidades base ──────────────────────────────────────────

export interface Organization {
  id: string;
  business_name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  google_sub: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  full_name: string;
  phone_whatsapp: string | null;
  birth_date: string | null;
  consent_given_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  base_price: number;
  active_discount_percentage: number;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  unit_cost: number;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Sale {
  id: string;
  organization_id: string;
  employee_id: string;
  client_id: string | null;
  subtotal: number;
  discount_total: number;
  final_total: number;
  tip_amount: number;
  payment_method: PaymentMethod;
  cash_amount: number | null;
  transfer_amount: number | null;
  transfer_receipt_key: string | null;
  status: SaleStatus;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  organization_id: string;
  service_id: string | null;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  product_id: string;
  delta: number;
  reason: StockMovementReason;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedExpense {
  id: string;
  organization_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expense_date: string;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CommissionRule {
  id: string;
  organization_id: string;
  employee_id: string | null;
  service_id: string | null;
  percentage: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SalaryAdvance {
  id: string;
  organization_id: string;
  employee_id: string;
  amount: number;
  note: string | null;
  advance_date: string;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiProviderConnection {
  id: string;
  organization_id: string;
  provider: AiProvider;
  monthly_quota: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── Sync protocol ───────────────────────────────────────────

/** Checkpoint para pull incremental (estilo RxDB) */
export interface SyncCheckpoint {
  updated_at: string;
  id: string;
}

/** Documento sincronizable genérico */
export interface SyncDocument {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SyncPullRequest {
  collection: string;
  checkpoint: SyncCheckpoint | null;
  limit: number;
}

export interface SyncPullResponse<T extends SyncDocument = SyncDocument> {
  documents: T[];
  checkpoint: SyncCheckpoint | null;
}

export interface SyncPushRequest<T extends SyncDocument = SyncDocument> {
  collection: string;
  writes: T[];
}

export interface SyncPushResponse {
  accepted: string[];
  rejected: Array<{
    id: string;
    reason: string;
  }>;
}

// ── Auth ────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;          // user.id
  email: string;
  role: UserRole;
  org: string | null;   // organization_id
  iat: number;
  exp: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface GoogleAuthRequest {
  id_token: string;
  /** 'web' | 'android' — el backend valida contra el client_id correcto */
  platform: 'web' | 'android';
}

export interface TenantCreateResponse {
  organization_id: string;
  join_code: string;     // código en claro, mostrar una sola vez
}

export interface TenantJoinRequest {
  join_code: string;
}

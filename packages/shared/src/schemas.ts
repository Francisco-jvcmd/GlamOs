// ============================================================
// GlamOS — Zod schemas para validación de payloads de sync
// ============================================================

import { z } from 'zod';

// ── Helpers ─────────────────────────────────────────────────

const uuid = z.string().uuid();
const isoDate = z.string().datetime({ offset: true });
const optionalIsoDate = isoDate.nullable().optional();
const price = z.number().nonnegative().multipleOf(0.01);
const percentage = z.number().int().min(0).max(100);

// ── Sync protocol ───────────────────────────────────────────

export const SyncCheckpointSchema = z.object({
  updated_at: isoDate,
  id: uuid,
});

export const SyncPullRequestSchema = z.object({
  collection: z.string().min(1).max(60),
  checkpoint: SyncCheckpointSchema.nullable(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const SyncPushRowSchema = z.object({
  id: uuid,
  organization_id: uuid,
  updated_at: isoDate,
  deleted_at: optionalIsoDate,
}).passthrough(); // allow collection-specific fields

export const SyncPushRequestSchema = z.object({
  collection: z.string().min(1).max(60),
  writes: z.array(SyncPushRowSchema).min(1).max(100),
});

// ── Auth ────────────────────────────────────────────────────

export const GoogleAuthRequestSchema = z.object({
  id_token: z.string().min(1),
  platform: z.enum(['web', 'android']),
});

export const TenantJoinRequestSchema = z.object({
  join_code: z
    .string()
    .min(8)
    .max(20)
    .regex(/^GLAM-\d{4}-[A-Z0-9]$/, 'Formato: GLAM-XXXX-X'),
});

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

// ── Sales ───────────────────────────────────────────────────

export const CreateSaleItemSchema = z.object({
  id: uuid,
  service_id: uuid.nullable().optional(),
  product_id: uuid.nullable().optional(),
  quantity: z.number().int().positive(),
  unit_price: price,
  discount_percentage: percentage.default(0),
  line_total: price,
}).refine(
  (d) => d.service_id != null || d.product_id != null,
  { message: 'Se requiere service_id o product_id' }
);

export const CreateSaleSchema = z.object({
  id: uuid,
  client_id: uuid.nullable().optional(),
  items: z.array(CreateSaleItemSchema).min(1),
  subtotal: price,
  discount_total: price.default(0),
  final_total: price,
  tip_amount: price.default(0),
  payment_method: z.enum(['CASH', 'TRANSFER', 'MIXED']),
  cash_amount: price.nullable().optional(),
  transfer_amount: price.nullable().optional(),
  transfer_receipt_key: z.string().nullable().optional(),
  created_at: isoDate,
});

export const VoidSaleSchema = z.object({
  void_reason: z.string().min(3).max(500),
});

// ── Inventory ───────────────────────────────────────────────

export const StockAdjustmentSchema = z.object({
  id: uuid,
  product_id: uuid,
  delta: z.number().int().refine((n) => n !== 0, 'Delta no puede ser 0'),
  reason: z.enum(['MANUAL_ADJUST', 'PURCHASE']),
  created_at: isoDate,
});

// ── Clients ─────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  id: uuid,
  full_name: z.string().min(2).max(120),
  phone_whatsapp: z.string().max(20).nullable().optional(),
  birth_date: z.string().date().nullable().optional(),
  consent_given_at: isoDate.nullable().optional(),
});

// ── Finance ─────────────────────────────────────────────────

export const CreateFixedExpenseSchema = z.object({
  id: uuid,
  category: z.enum([
    'RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MARKETING', 'OTHER',
  ]),
  description: z.string().max(200).nullable().optional(),
  amount: price.positive(),
  expense_date: z.string().date(),
});

// ── AI ──────────────────────────────────────────────────────

export const AiGenerateRequestSchema = z.object({
  prompt: z.string().min(3).max(1000),
  style: z.string().max(60).optional(),
  reference_image_key: z.string().optional(),
});

export const AiConnectionSchema = z.object({
  provider: z.enum([
    'HOUSE_FREE', 'BYOK_FLUX', 'BYOK_STABILITY', 'BYOK_HUGGINGFACE',
  ]),
  api_key: z.string().min(1).optional(),
  monthly_quota: z.number().int().positive().default(15),
});

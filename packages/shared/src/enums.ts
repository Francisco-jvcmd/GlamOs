// ============================================================
// GlamOS — Enums compartidos (espejo de los ENUM de Postgres)
// ============================================================

export const UserRole = {
  OWNER_ADMIN: 'OWNER_ADMIN',
  EMPLOYEE: 'EMPLOYEE',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PaymentMethod = {
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  MIXED: 'MIXED',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const SaleStatus = {
  COMPLETED: 'COMPLETED',
  VOIDED: 'VOIDED',
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const ExpenseCategory = {
  RENT: 'RENT',
  UTILITIES: 'UTILITIES',
  SALARIES: 'SALARIES',
  SUPPLIES: 'SUPPLIES',
  MARKETING: 'MARKETING',
  OTHER: 'OTHER',
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const AiProvider = {
  HOUSE_FREE: 'HOUSE_FREE',
  BYOK_FLUX: 'BYOK_FLUX',
  BYOK_STABILITY: 'BYOK_STABILITY',
  BYOK_HUGGINGFACE: 'BYOK_HUGGINGFACE',
} as const;
export type AiProvider = (typeof AiProvider)[keyof typeof AiProvider];

export const StockMovementReason = {
  SALE: 'SALE',
  VOID_REVERSAL: 'VOID_REVERSAL',
  MANUAL_ADJUST: 'MANUAL_ADJUST',
  PURCHASE: 'PURCHASE',
} as const;
export type StockMovementReason = (typeof StockMovementReason)[keyof typeof StockMovementReason];

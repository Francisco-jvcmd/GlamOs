/**
 * RxDB collection schemas.
 *
 * MUST mirror the Postgres tables in infra/schema.sql exactly.
 * The sync engine pushes/pulls these documents as-is.
 *
 * RxDB JSON Schema rules:
 *  - primaryKey must have maxLength defined
 *  - nullable fields use { type: ['string', 'null'] }
 *  - no NUMERIC type in JSON Schema — use 'number'
 */

export const salesSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:                     { type: 'string', maxLength: 100 },
    organization_id:        { type: 'string', maxLength: 100 },
    employee_id:            { type: 'string', maxLength: 100 },
    client_id:              { type: ['string', 'null'] },
    subtotal:               { type: 'number' },
    discount_total:         { type: 'number' },
    final_total:            { type: 'number' },
    tip_amount:             { type: 'number' },
    payment_method:         { type: 'string' },       // CASH, TRANSFER, MIXED
    cash_amount:            { type: ['number', 'null'] },
    transfer_amount:        { type: ['number', 'null'] },
    transfer_receipt_key:   { type: ['string', 'null'] },
    status:                 { type: 'string' },        // COMPLETED, VOIDED
    voided_at:              { type: ['string', 'null'] },
    voided_by:              { type: ['string', 'null'] },
    void_reason:            { type: ['string', 'null'] },
    created_at:             { type: 'string', maxLength: 50 },
    updated_at:             { type: 'string', maxLength: 50 },
    deleted_at:             { type: ['string', 'null'] },
  },
  required: [
    'id', 'organization_id', 'employee_id',
    'subtotal', 'discount_total', 'final_total', 'tip_amount',
    'payment_method', 'status',
    'created_at', 'updated_at',
  ],
  indexes: [
    'updated_at',
    ['organization_id', 'created_at'],
    ['organization_id', 'employee_id'],
  ],
};

export const saleItemsSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:                  { type: 'string', maxLength: 100 },
    sale_id:             { type: 'string', maxLength: 100 },
    organization_id:     { type: 'string' },
    service_id:          { type: ['string', 'null'] },
    product_id:          { type: ['string', 'null'] },
    quantity:            { type: 'number' },
    unit_price:          { type: 'number' },
    discount_percentage: { type: 'number' },
    line_total:          { type: 'number' },
    created_at:          { type: 'string' },
    updated_at:          { type: 'string', maxLength: 50 },
  },
  required: [
    'id', 'sale_id', 'organization_id',
    'quantity', 'unit_price', 'discount_percentage', 'line_total',
    'created_at', 'updated_at',
  ],
  indexes: [
    'updated_at',
    'sale_id',
  ],
};

export const servicesSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:                          { type: 'string', maxLength: 100 },
    organization_id:             { type: 'string' },
    name:                        { type: 'string' },
    base_price:                  { type: 'number' },
    active_discount_percentage:  { type: 'number' },
    discount_starts_at:          { type: ['string', 'null'] },
    discount_ends_at:            { type: ['string', 'null'] },
    created_at:                  { type: 'string' },
    updated_at:                  { type: 'string', maxLength: 50 },
    deleted_at:                  { type: ['string', 'null'] },
  },
  required: [
    'id', 'organization_id', 'name', 'base_price',
    'active_discount_percentage', 'created_at', 'updated_at',
  ],
  indexes: ['updated_at'],
};

export const productsSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:              { type: 'string', maxLength: 100 },
    organization_id: { type: 'string' },
    name:            { type: 'string' },
    sku:             { type: ['string', 'null'] },
    unit_cost:       { type: 'number' },
    unit_price:      { type: 'number' },
    current_stock:   { type: 'number' },
    min_stock_alert: { type: 'number' },
    created_at:      { type: 'string' },
    updated_at:      { type: 'string', maxLength: 50 },
    deleted_at:      { type: ['string', 'null'] },
  },
  required: [
    'id', 'organization_id', 'name',
    'unit_cost', 'unit_price', 'current_stock', 'min_stock_alert',
    'created_at', 'updated_at',
  ],
  indexes: ['updated_at'],
};

export const clientsSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:               { type: 'string', maxLength: 100 },
    organization_id:  { type: 'string' },
    full_name:        { type: 'string', maxLength: 200 },
    phone_whatsapp:   { type: ['string', 'null'] },
    birth_date:       { type: ['string', 'null'] },
    consent_given_at: { type: ['string', 'null'] },
    created_at:       { type: 'string' },
    updated_at:       { type: 'string', maxLength: 50 },
    deleted_at:       { type: ['string', 'null'] },
  },
  required: [
    'id', 'organization_id', 'full_name',
    'created_at', 'updated_at',
  ],
  indexes: ['updated_at', 'full_name'],
};

export const stockMovementsSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:              { type: 'string', maxLength: 100 },
    organization_id: { type: 'string' },
    product_id:      { type: 'string', maxLength: 100 },
    delta:           { type: 'number' },   // +incoming, -outgoing
    reason:          { type: 'string' },   // SALE, VOID_REVERSAL, MANUAL_ADJUST, PURCHASE
    reference_id:    { type: ['string', 'null'] },
    created_at:      { type: 'string' },
    updated_at:      { type: 'string', maxLength: 50 },
  },
  required: [
    'id', 'organization_id', 'product_id',
    'delta', 'reason',
    'created_at', 'updated_at',
  ],
  indexes: ['updated_at', 'product_id'],
};

export const fixedExpensesSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id:              { type: 'string', maxLength: 100 },
    organization_id: { type: 'string' },
    category:        { type: 'string' },    // RENT, UTILITIES, SALARIES, SUPPLIES, MARKETING, OTHER
    description:     { type: ['string', 'null'] },
    amount:          { type: 'number' },
    expense_date:    { type: 'string' },     // YYYY-MM-DD
    registered_by:   { type: ['string', 'null'] },
    created_at:      { type: 'string' },
    updated_at:      { type: 'string', maxLength: 50 },
    deleted_at:      { type: ['string', 'null'] },
  },
  required: [
    'id', 'organization_id', 'category', 'amount', 'expense_date',
    'created_at', 'updated_at',
  ],
  indexes: ['updated_at'],
};

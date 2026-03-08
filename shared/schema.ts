import { pgTable, serial, varchar, text, decimal, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['admin', 'operator']);
export const txTypeEnum = pgEnum('tx_type', ['deposit', 'withdrawal', 'exchange_in', 'exchange_out', 'transfer_in', 'transfer_out']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'cancelled']);
export const idTypeEnum = pgEnum('id_type', ['passport', 'drivers_license', 'national_id']);
export const settlementEnum = pgEnum('settlement_method', ['cash', 'bank_transfer']);
export const settlementDirectionEnum = pgEnum('settlement_direction', ['in', 'out']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull().default('operator'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 200 }),
  wechat: varchar('wechat', { length: 100 }),
  idType: idTypeEnum('id_type'),
  idNumber: varchar('id_number', { length: 100 }),
  idExpiry: varchar('id_expiry', { length: 20 }),
  dateOfBirth: varchar('date_of_birth', { length: 20 }),
  bankName: varchar('bank_name', { length: 200 }),
  bankAccount: varchar('bank_account', { length: 100 }),
  bankBsb: varchar('bank_bsb', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  currency: varchar('currency', { length: 10 }).notNull(),
  balance: decimal('balance', { precision: 18, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Your company's own bank accounts
export const companyAccounts = pgTable('company_accounts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),          // e.g. "ANZ AUD Main", "WeChat Pay CNY"
  currency: varchar('currency', { length: 10 }).notNull(),
  bankName: varchar('bank_name', { length: 200 }),
  accountNumber: varchar('account_number', { length: 100 }),
  bsb: varchar('bsb', { length: 20 }),
  balance: decimal('balance', { precision: 18, scale: 4 }).notNull().default('0'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  walletId: integer('wallet_id').notNull().references(() => wallets.id),
  type: txTypeEnum('type').notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 18, scale: 4 }).notNull(),
  // How was this settled?
  settlementMethod: settlementEnum('settlement_method'),    // 'cash' or 'bank_transfer'
  settlementDirection: settlementDirectionEnum('settlement_direction'), // 'in' (we receive) or 'out' (we pay)
  // Which company account did the money go to/from?
  companyAccountId: integer('company_account_id').references(() => companyAccounts.id),
  note: text('note'),
  exchangeOrderId: integer('exchange_order_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  fromCurrency: varchar('from_currency', { length: 10 }).notNull(),
  toCurrency: varchar('to_currency', { length: 10 }).notNull(),
  rate: decimal('rate', { precision: 18, scale: 6 }).notNull(),
  source: varchar('source', { length: 50 }),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  contact: varchar('contact', { length: 200 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 200 }),
  wechat: varchar('wechat', { length: 100 }),
  bankName: varchar('bank_name', { length: 200 }),
  bankAccount: varchar('bank_account', { length: 100 }),
  bankBsb: varchar('bank_bsb', { length: 20 }),
  supportedCurrencies: text('supported_currencies').notNull().default('[]'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const exchangeOrders = pgTable('exchange_orders', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  fromCurrency: varchar('from_currency', { length: 10 }).notNull(),
  toCurrency: varchar('to_currency', { length: 10 }).notNull(),
  fromAmount: decimal('from_amount', { precision: 18, scale: 4 }).notNull(),
  toAmount: decimal('to_amount', { precision: 18, scale: 4 }).notNull(),
  marketRate: decimal('market_rate', { precision: 18, scale: 6 }).notNull(),
  ourRate: decimal('our_rate', { precision: 18, scale: 6 }).notNull(),
  supplierRate: decimal('supplier_rate', { precision: 18, scale: 6 }).notNull().default('0'),
  feeRate: decimal('fee_rate', { precision: 8, scale: 4 }).notNull().default('0'),
  feeAmount: decimal('fee_amount', { precision: 18, scale: 4 }).notNull().default('0'),
  profit: decimal('profit', { precision: 18, scale: 4 }).notNull().default('0'),
  // Settlement for the FROM side (client paying us)
  inSettlementMethod: settlementEnum('in_settlement_method'),
  inCompanyAccountId: integer('in_company_account_id').references(() => companyAccounts.id),
  // Settlement for the TO side (us paying client)
  outSettlementMethod: settlementEnum('out_settlement_method'),
  outCompanyAccountId: integer('out_company_account_id').references(() => companyAccounts.id),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const supplierPayments = pgTable('supplier_payments', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  exchangeOrderId: integer('exchange_order_id').notNull().references(() => exchangeOrders.id),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  currency: varchar('currency', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  settlementMethod: settlementEnum('settlement_method'),
  companyAccountId: integer('company_account_id').references(() => companyAccounts.id),
  note: text('note'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  wallets: many(wallets),
  transactions: many(transactions),
  exchangeOrders: many(exchangeOrders),
  supplierPayments: many(supplierPayments),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  customer: one(customers, { fields: [wallets.customerId], references: [customers.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  customer: one(customers, { fields: [transactions.customerId], references: [customers.id] }),
  wallet: one(wallets, { fields: [transactions.walletId], references: [wallets.id] }),
  companyAccount: one(companyAccounts, { fields: [transactions.companyAccountId], references: [companyAccounts.id] }),
}));

export const exchangeOrdersRelations = relations(exchangeOrders, ({ one, many }) => ({
  customer: one(customers, { fields: [exchangeOrders.customerId], references: [customers.id] }),
  supplier: one(suppliers, { fields: [exchangeOrders.supplierId], references: [suppliers.id] }),
  supplierPayments: many(supplierPayments),
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierPayments.supplierId], references: [suppliers.id] }),
  exchangeOrder: one(exchangeOrders, { fields: [supplierPayments.exchangeOrderId], references: [exchangeOrders.id] }),
  customer: one(customers, { fields: [supplierPayments.customerId], references: [customers.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  payments: many(supplierPayments),
  orders: many(exchangeOrders),
}));

export const companyAccountsRelations = relations(companyAccounts, ({ many }) => ({
  transactions: many(transactions),
}));

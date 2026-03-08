import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { ensureDefaultAdmin } from './auth.js';
import { refreshRates } from './rates.js';
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import exchangeRouter from './routes/exchange.js';
import suppliersRouter from './routes/suppliers.js';
import txRouter, { dashRouter, ratesRouter } from './routes/transactions.js';
import accountsRouter from './routes/accounts.js';
import ordersRouter from './routes/orders.js';
import { sql } from 'drizzle-orm';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(express.json());
app.set('trust proxy', 1);

// JWT auth - no session middleware needed

// API routes
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/exchange', exchangeRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/transactions', txRouter);
app.use('/api/dashboard', dashRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/orders', ordersRouter);

// Serve built frontend in production
const distPath = path.join(__dirname, '..', 'dist');
// No cache on HTML so browser always gets latest index.html
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function init() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connected');

    await db.execute(sql`DO $$ BEGIN CREATE TYPE settlement_method AS ENUM ('cash', 'bank_transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await db.execute(sql`DO $$ BEGIN CREATE TYPE settlement_direction AS ENUM ('in', 'out'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await db.execute(sql`DO $$ BEGIN CREATE TYPE role AS ENUM ('admin', 'operator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await db.execute(sql`DO $$ BEGIN CREATE TYPE tx_type AS ENUM ('deposit', 'withdrawal', 'exchange_in', 'exchange_out', 'transfer_in', 'transfer_out'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await db.execute(sql`DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await db.execute(sql`DO $$ BEGIN CREATE TYPE id_type AS ENUM ('passport', 'drivers_license', 'national_id'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN CREATE TYPE order_status AS ENUM ('cash_received', 'bb_deposited', 'sent_to_supplier', 'supplier_converting', 'completed', 'cancelled'); END IF; END $$;`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS remittance_orders (
      id SERIAL PRIMARY KEY,
      reference VARCHAR(30) NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      from_currency VARCHAR(10) NOT NULL,
      to_currency VARCHAR(10) NOT NULL,
      from_amount DECIMAL(18,4) NOT NULL,
      to_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
      client_rate DECIMAL(18,6) NOT NULL,
      supplier_rate DECIMAL(18,6) NOT NULL DEFAULT 0,
      profit DECIMAL(18,4) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'cash_received',
      bb_name VARCHAR(200),
      bb_deposit_ref VARCHAR(200),
      in_company_account_id INTEGER REFERENCES company_accounts(id),
      out_company_account_id INTEGER REFERENCES company_accounts(id),
      payout_method VARCHAR(30),
      payout_detail TEXT,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS company_accounts (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, currency VARCHAR(10) NOT NULL, bank_name VARCHAR(200), account_number VARCHAR(100), bsb VARCHAR(20), balance DECIMAL(18,4) NOT NULL DEFAULT 0, notes TEXT, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, password TEXT NOT NULL, role role NOT NULL DEFAULT 'operator', active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(50), email VARCHAR(200), wechat VARCHAR(100), id_type id_type, id_number VARCHAR(100), id_expiry VARCHAR(20), date_of_birth VARCHAR(20), bank_name VARCHAR(200), bank_account VARCHAR(100), bank_bsb VARCHAR(20), notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS wallets (id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE, currency VARCHAR(10) NOT NULL, balance DECIMAL(18,4) NOT NULL DEFAULT 0, updated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(customer_id, currency))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS suppliers (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, contact VARCHAR(200), phone VARCHAR(50), email VARCHAR(200), wechat VARCHAR(100), bank_name VARCHAR(200), bank_account VARCHAR(100), bank_bsb VARCHAR(20), supported_currencies TEXT NOT NULL DEFAULT '[]', notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS exchange_rates (id SERIAL PRIMARY KEY, from_currency VARCHAR(10) NOT NULL, to_currency VARCHAR(10) NOT NULL, rate DECIMAL(18,6) NOT NULL, source VARCHAR(50), fetched_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS exchange_orders (id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), supplier_id INTEGER REFERENCES suppliers(id), from_currency VARCHAR(10) NOT NULL, to_currency VARCHAR(10) NOT NULL, from_amount DECIMAL(18,4) NOT NULL, to_amount DECIMAL(18,4) NOT NULL, market_rate DECIMAL(18,6) NOT NULL, our_rate DECIMAL(18,6) NOT NULL, supplier_rate DECIMAL(18,6) NOT NULL DEFAULT 0, fee_rate DECIMAL(8,4) NOT NULL DEFAULT 0, fee_amount DECIMAL(18,4) NOT NULL DEFAULT 0, profit DECIMAL(18,4) NOT NULL DEFAULT 0, note TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), wallet_id INTEGER NOT NULL REFERENCES wallets(id), type tx_type NOT NULL, currency VARCHAR(10) NOT NULL, amount DECIMAL(18,4) NOT NULL, balance_after DECIMAL(18,4) NOT NULL, note TEXT, exchange_order_id INTEGER, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_payments (id SERIAL PRIMARY KEY, supplier_id INTEGER NOT NULL REFERENCES suppliers(id), exchange_order_id INTEGER NOT NULL REFERENCES exchange_orders(id), customer_id INTEGER NOT NULL REFERENCES customers(id), currency VARCHAR(10) NOT NULL, amount DECIMAL(18,4) NOT NULL, status payment_status NOT NULL DEFAULT 'pending', note TEXT, completed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);

    // Migrations for new columns
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settlement_method settlement_method`);
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settlement_direction settlement_direction`);
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_account_id INTEGER REFERENCES company_accounts(id)`);
    await db.execute(sql`ALTER TABLE exchange_orders ADD COLUMN IF NOT EXISTS in_settlement_method settlement_method`);
    await db.execute(sql`ALTER TABLE exchange_orders ADD COLUMN IF NOT EXISTS in_company_account_id INTEGER REFERENCES company_accounts(id)`);
    await db.execute(sql`ALTER TABLE exchange_orders ADD COLUMN IF NOT EXISTS out_settlement_method settlement_method`);
    await db.execute(sql`ALTER TABLE exchange_orders ADD COLUMN IF NOT EXISTS out_company_account_id INTEGER REFERENCES company_accounts(id)`);
    await db.execute(sql`ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS settlement_method settlement_method`);
    await db.execute(sql`ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS company_account_id INTEGER REFERENCES company_accounts(id)`);
    // Add supplier_rate column if it doesn't exist (migration)
    await db.execute(sql`ALTER TABLE exchange_orders ADD COLUMN IF NOT EXISTS supplier_rate DECIMAL(18,6) NOT NULL DEFAULT 0`);
    console.log('✅ Tables ready');
    await ensureDefaultAdmin();
    await refreshRates().catch(e => console.log('Rate refresh skipped:', e.message));

    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 FX Ledger running on port ${PORT}`));
    ;
  } catch (err) {
    console.error('❌ Init error:', err);
    process.exit(1);
  }
}

init();

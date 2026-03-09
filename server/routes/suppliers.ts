import { Router } from 'express';
import { db } from '../db';
import { suppliers, supplierPayments, customers, exchangeOrders } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  res.json(rows);
});

router.get('/payments/all', async (req, res) => {
  const rows = await db.select({
    id: supplierPayments.id, supplierId: supplierPayments.supplierId,
    exchangeOrderId: supplierPayments.exchangeOrderId, customerId: supplierPayments.customerId,
    currency: supplierPayments.currency, amount: supplierPayments.amount, status: supplierPayments.status,
    note: supplierPayments.note, completedAt: supplierPayments.completedAt, createdAt: supplierPayments.createdAt,
    supplierName: suppliers.name, customerName: customers.name,
  })
    .from(supplierPayments)
    .leftJoin(suppliers, eq(supplierPayments.supplierId, suppliers.id))
    .leftJoin(customers, eq(supplierPayments.customerId, customers.id))
    .orderBy(desc(supplierPayments.createdAt))
    .limit(100);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [s] = await db.select().from(suppliers).where(eq(suppliers.id, parseInt(req.params.id)));
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

router.post('/', async (req, res) => {
  const { name, contact, phone, email, wechat, bankName, bankAccount, bankBsb, supportedCurrencies, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const [s] = await db.insert(suppliers).values({
    name, contact, phone, email, wechat, bankName, bankAccount, bankBsb,
    supportedCurrencies: JSON.stringify(supportedCurrencies || []), notes,
  }).returning();
  res.json(s);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, contact, phone, email, wechat, bankName, bankAccount, bankBsb, supportedCurrencies, notes } = req.body;
  const [s] = await db.update(suppliers).set({
    name, contact, phone, email, wechat, bankName, bankAccount, bankBsb,
    supportedCurrencies: JSON.stringify(supportedCurrencies || []), notes,
  }).where(eq(suppliers.id, id)).returning();
  res.json(s);
});

router.delete('/:id', async (req, res) => {
  await db.delete(suppliers).where(eq(suppliers.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

// Remittance orders assigned to this supplier
router.get('/:id/orders', async (req, res) => {
  try {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT ro.*, c.name AS customer_name
      FROM remittance_orders ro
      JOIN customers c ON ro.customer_id = c.id
      WHERE ro.supplier_id = ${parseInt(req.params.id)}
      ORDER BY ro.created_at DESC
      LIMIT 50
    `);
    const rows = (result as any).rows || result;
    res.json((rows as any[]).map((r: any) => ({
      id: r.id, reference: r.reference, status: r.status,
      fromCurrency: r.from_currency, toCurrency: r.to_currency,
      fromAmount: r.from_amount, toAmount: r.to_amount,
      customerName: r.customer_name, bbName: r.bb_name,
      createdAt: r.created_at, completedAt: r.completed_at,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.get('/:id/payments', async (req, res) => {
  const rows = await db.select({
    id: supplierPayments.id, supplierId: supplierPayments.supplierId,
    exchangeOrderId: supplierPayments.exchangeOrderId, customerId: supplierPayments.customerId,
    currency: supplierPayments.currency, amount: supplierPayments.amount, status: supplierPayments.status,
    note: supplierPayments.note, completedAt: supplierPayments.completedAt, createdAt: supplierPayments.createdAt,
    customerName: customers.name,
    customerBankName: customers.bankName, customerBankAccount: customers.bankAccount, customerBankBsb: customers.bankBsb,
    orderFromCurrency: exchangeOrders.fromCurrency, orderToCurrency: exchangeOrders.toCurrency,
    orderFromAmount: exchangeOrders.fromAmount, orderToAmount: exchangeOrders.toAmount,
  })
    .from(supplierPayments)
    .leftJoin(customers, eq(supplierPayments.customerId, customers.id))
    .leftJoin(exchangeOrders, eq(supplierPayments.exchangeOrderId, exchangeOrders.id))
    .where(eq(supplierPayments.supplierId, parseInt(req.params.id)))
    .orderBy(desc(supplierPayments.createdAt));
  res.json(rows);
});

router.patch('/payments/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['completed', 'cancelled', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const [p] = await db.update(supplierPayments)
    .set({ status, completedAt: status === 'completed' ? new Date() : null })
    .where(eq(supplierPayments.id, parseInt(req.params.id)))
    .returning();
  res.json(p);
});

export default router;

// Catch async errors in this router
router.use((err: any, req: any, res: any, next: any) => {
  console.error(`Route error in ${req.method} ${req.path}:`, err?.message);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

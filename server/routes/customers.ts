import { Router } from 'express';
import { db } from '../db';
import { customers, wallets, transactions, exchangeOrders, suppliers } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

router.post('/', async (req, res) => {
  const { name, phone, email, wechat, idType, idNumber, idExpiry, dateOfBirth, bankName, bankAccount, bankBsb, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const [c] = await db.insert(customers).values({ name, phone, email, wechat, idType, idNumber, idExpiry, dateOfBirth, bankName, bankAccount, bankBsb, notes }).returning();
  res.json(c);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, email, wechat, idType, idNumber, idExpiry, dateOfBirth, bankName, bankAccount, bankBsb, notes } = req.body;
  const [c] = await db.update(customers).set({ name, phone, email, wechat, idType, idNumber, idExpiry, dateOfBirth, bankName, bankAccount, bankBsb, notes }).where(eq(customers.id, id)).returning();
  res.json(c);
});

router.delete('/:id', async (req, res) => {
  await db.delete(customers).where(eq(customers.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

router.get('/:id/wallets', async (req, res) => {
  const rows = await db.select().from(wallets).where(eq(wallets.customerId, parseInt(req.params.id)));
  res.json(rows);
});

router.get('/:id/transactions', async (req, res) => {
  const rows = await db.select().from(transactions)
    .where(eq(transactions.customerId, parseInt(req.params.id)))
    .orderBy(desc(transactions.createdAt))
    .limit(100);
  res.json(rows);
});

router.get('/:id/exchanges', async (req, res) => {
  const rows = await db.select({
    id: exchangeOrders.id, customerId: exchangeOrders.customerId, supplierId: exchangeOrders.supplierId,
    fromCurrency: exchangeOrders.fromCurrency, toCurrency: exchangeOrders.toCurrency,
    fromAmount: exchangeOrders.fromAmount, toAmount: exchangeOrders.toAmount,
    marketRate: exchangeOrders.marketRate, ourRate: exchangeOrders.ourRate,
    feeRate: exchangeOrders.feeRate, feeAmount: exchangeOrders.feeAmount, profit: exchangeOrders.profit,
    note: exchangeOrders.note, createdAt: exchangeOrders.createdAt,
    supplierName: suppliers.name,
  })
    .from(exchangeOrders)
    .leftJoin(suppliers, eq(exchangeOrders.supplierId, suppliers.id))
    .where(eq(exchangeOrders.customerId, parseInt(req.params.id)))
    .orderBy(desc(exchangeOrders.createdAt))
    .limit(100);
  res.json(rows);
});

router.post('/:id/deposit', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const { currency, amount, note } = req.body;
  if (!currency || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid deposit data' });

  const allWallets = await db.select().from(wallets).where(eq(wallets.customerId, customerId));
  let w = allWallets.find(w => w.currency === currency);
  if (!w) {
    const [created] = await db.insert(wallets).values({ customerId, currency, balance: '0' }).returning();
    w = created;
  }

  const newBalance = parseFloat(w.balance) + parseFloat(amount);
  await db.update(wallets).set({ balance: newBalance.toFixed(4), updatedAt: new Date() }).where(eq(wallets.id, w.id));

  const [tx] = await db.insert(transactions).values({
    customerId, walletId: w.id, type: 'deposit', currency,
    amount: parseFloat(amount).toFixed(4),
    balanceAfter: newBalance.toFixed(4),
    note: note || 'Cash deposit',
  }).returning();

  res.json({ transaction: tx, newBalance });
});

router.post('/:id/withdraw', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const { currency, amount, note } = req.body;
  if (!currency || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid withdrawal data' });

  const allWallets = await db.select().from(wallets).where(eq(wallets.customerId, customerId));
  const w = allWallets.find(w => w.currency === currency);
  if (!w) return res.status(400).json({ error: 'Wallet not found' });
  if (parseFloat(w.balance) < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' });

  const newBalance = parseFloat(w.balance) - parseFloat(amount);
  await db.update(wallets).set({ balance: newBalance.toFixed(4), updatedAt: new Date() }).where(eq(wallets.id, w.id));

  const [tx] = await db.insert(transactions).values({
    customerId, walletId: w.id, type: 'withdrawal', currency,
    amount: (-parseFloat(amount)).toFixed(4),
    balanceAfter: newBalance.toFixed(4),
    note: note || 'Cash withdrawal',
  }).returning();

  res.json({ transaction: tx, newBalance });
});

export default router;

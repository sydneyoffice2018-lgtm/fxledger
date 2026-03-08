import { Router } from 'express';
import { db } from '../db';
import { transactions, exchangeOrders, customers } from '../../shared/schema';
import { eq, desc, gte } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { getAllLatestRates, refreshRates } from '../rates';

const txRouter = Router();
txRouter.use(requireAuth);

txRouter.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const rows = await db.select({
    id: transactions.id, customerId: transactions.customerId, walletId: transactions.walletId,
    type: transactions.type, currency: transactions.currency, amount: transactions.amount,
    balanceAfter: transactions.balanceAfter, note: transactions.note,
    exchangeOrderId: transactions.exchangeOrderId, createdAt: transactions.createdAt,
    customerName: customers.name,
  })
    .from(transactions)
    .leftJoin(customers, eq(transactions.customerId, customers.id))
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(rows);
});

export default txRouter;

export const dashRouter = Router();
dashRouter.use(requireAuth);

dashRouter.get('/stats', async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const allOrders = await db.select().from(exchangeOrders).orderBy(desc(exchangeOrders.createdAt));
  const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= today);
  const monthOrders = allOrders.filter(o => new Date(o.createdAt) >= monthStart);

  const todayProfit = todayOrders.reduce((s, o) => s + parseFloat(String(o.profit || 0)), 0);
  const monthProfit = monthOrders.reduce((s, o) => s + parseFloat(String(o.profit || 0)), 0);

  const allCustomers = await db.select({ id: customers.id }).from(customers);

  const recentTx = await db.select({
    id: transactions.id, customerId: transactions.customerId, walletId: transactions.walletId,
    type: transactions.type, currency: transactions.currency, amount: transactions.amount,
    balanceAfter: transactions.balanceAfter, note: transactions.note,
    exchangeOrderId: transactions.exchangeOrderId, createdAt: transactions.createdAt,
    customerName: customers.name,
  })
    .from(transactions)
    .leftJoin(customers, eq(transactions.customerId, customers.id))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  res.json({
    todayExchanges: todayOrders.length,
    todayProfit,
    monthExchanges: monthOrders.length,
    monthProfit,
    totalCustomers: allCustomers.length,
    recentTransactions: recentTx,
  });
});

dashRouter.get('/chart', async (req, res) => {
  const days = 30;
  const allOrders = await db.select().from(exchangeOrders);
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const dayOrders = allOrders.filter(o => new Date(o.createdAt) >= d && new Date(o.createdAt) < next);
    result.push({
      date: d.toISOString().split('T')[0],
      profit: dayOrders.reduce((s, o) => s + parseFloat(o.profit), 0),
      volume: dayOrders.reduce((s, o) => s + parseFloat(o.fromAmount), 0),
      count: dayOrders.length,
    });
  }
  res.json(result);
});

export const ratesRouter = Router();
ratesRouter.use(requireAuth);

ratesRouter.get('/', async (req, res) => {
  const rates = await getAllLatestRates();
  res.json(rates);
});

ratesRouter.post('/refresh', async (req, res) => {
  await refreshRates();
  const rates = await getAllLatestRates();
  res.json(rates);
});

import { Router } from 'express';
import { db } from '../db';
import { wallets, transactions, exchangeOrders, supplierPayments, customers, suppliers } from '../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = await db.select({
    id: exchangeOrders.id, customerId: exchangeOrders.customerId, supplierId: exchangeOrders.supplierId,
    fromCurrency: exchangeOrders.fromCurrency, toCurrency: exchangeOrders.toCurrency,
    fromAmount: exchangeOrders.fromAmount, toAmount: exchangeOrders.toAmount,
    marketRate: exchangeOrders.marketRate, ourRate: exchangeOrders.ourRate,
    feeRate: exchangeOrders.feeRate, feeAmount: exchangeOrders.feeAmount, profit: exchangeOrders.profit,
    note: exchangeOrders.note, createdAt: exchangeOrders.createdAt,
    customerName: customers.name, supplierName: suppliers.name,
  })
    .from(exchangeOrders)
    .leftJoin(customers, eq(exchangeOrders.customerId, customers.id))
    .leftJoin(suppliers, eq(exchangeOrders.supplierId, suppliers.id))
    .orderBy(desc(exchangeOrders.createdAt))
    .limit(200);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { customerId, supplierId, fromCurrency, toCurrency, fromAmount, toAmount, marketRate, ourRate, supplierRate, feeRate, feeAmount, profit, note } = req.body;

  if (!customerId || !fromCurrency || !toCurrency || !fromAmount || !toAmount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const allWallets = await db.select().from(wallets).where(eq(wallets.customerId, parseInt(customerId)));
  let fromWallet = allWallets.find(w => w.currency === fromCurrency);
  if (!fromWallet) return res.status(400).json({ error: `No ${fromCurrency} wallet found` });
  if (parseFloat(fromWallet.balance) < parseFloat(fromAmount)) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const newFromBalance = parseFloat(fromWallet.balance) - parseFloat(fromAmount);
  await db.update(wallets).set({ balance: newFromBalance.toFixed(4), updatedAt: new Date() }).where(eq(wallets.id, fromWallet.id));

  let toWallet = allWallets.find(w => w.currency === toCurrency);
  if (!toWallet) {
    const [created] = await db.insert(wallets).values({ customerId: parseInt(customerId), currency: toCurrency, balance: '0' }).returning();
    toWallet = created;
  }
  const newToBalance = parseFloat(toWallet.balance) + parseFloat(toAmount);
  await db.update(wallets).set({ balance: newToBalance.toFixed(4), updatedAt: new Date() }).where(eq(wallets.id, toWallet.id));

  const [order] = await db.insert(exchangeOrders).values({
    customerId: parseInt(customerId),
    supplierId: supplierId ? parseInt(supplierId) : null,
    fromCurrency, toCurrency,
    fromAmount: parseFloat(fromAmount).toFixed(4),
    toAmount: parseFloat(toAmount).toFixed(4),
    marketRate: parseFloat(marketRate).toFixed(6),
    ourRate: parseFloat(ourRate).toFixed(6),
    supplierRate: parseFloat(supplierRate || ourRate || 0).toFixed(6),
    feeRate: parseFloat(feeRate || 0).toFixed(4),
    feeAmount: parseFloat(feeAmount || 0).toFixed(4),
    profit: parseFloat(profit || 0).toFixed(4),
    note,
  }).returning();

  await db.insert(transactions).values([
    {
      customerId: parseInt(customerId), walletId: fromWallet.id,
      type: 'exchange_out', currency: fromCurrency,
      amount: (-parseFloat(fromAmount)).toFixed(4),
      balanceAfter: newFromBalance.toFixed(4),
      note: `Exchange to ${toCurrency}`,
      exchangeOrderId: order.id,
    },
    {
      customerId: parseInt(customerId), walletId: toWallet.id,
      type: 'exchange_in', currency: toCurrency,
      amount: parseFloat(toAmount).toFixed(4),
      balanceAfter: newToBalance.toFixed(4),
      note: `Exchange from ${fromCurrency}`,
      exchangeOrderId: order.id,
    },
  ]);

  if (supplierId) {
    await db.insert(supplierPayments).values({
      supplierId: parseInt(supplierId),
      exchangeOrderId: order.id,
      customerId: parseInt(customerId),
      currency: fromCurrency,
      amount: parseFloat(fromAmount).toFixed(4),
      status: 'pending',
      note: `Payment for exchange order #${order.id}`,
    });
  }

  res.json(order);
});

export default router;

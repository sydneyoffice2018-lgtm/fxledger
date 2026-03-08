import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// Generate reference: ORD-YYYYMMDD-XXXX
function genRef() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${date}-${rand}`;
}

// List orders with customer/supplier names
router.get('/', async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT
      ro.*,
      c.name AS customer_name,
      s.name AS supplier_name,
      ca_in.name  AS in_company_account_name,
      ca_out.name AS out_company_account_name
    FROM remittance_orders ro
    JOIN customers c ON ro.customer_id = c.id
    LEFT JOIN suppliers s ON ro.supplier_id = s.id
    LEFT JOIN company_accounts ca_in ON ro.in_company_account_id = ca_in.id
    LEFT JOIN company_accounts ca_out ON ro.out_company_account_id = ca_out.id
    ORDER BY ro.created_at DESC
  `);
  // camelCase
  const orders = (rows.rows as any[]).map(r => ({
    id: r.id,
    reference: r.reference,
    customerId: r.customer_id,
    customerName: r.customer_name,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    fromCurrency: r.from_currency,
    toCurrency: r.to_currency,
    fromAmount: r.from_amount,
    toAmount: r.to_amount,
    clientRate: r.client_rate,
    supplierRate: r.supplier_rate,
    profit: r.profit,
    status: r.status,
    bbName: r.bb_name,
    bbDepositRef: r.bb_deposit_ref,
    inCompanyAccountId: r.in_company_account_id,
    inCompanyAccountName: r.in_company_account_name,
    outCompanyAccountId: r.out_company_account_id,
    outCompanyAccountName: r.out_company_account_name,
    payoutMethod: r.payout_method,
    payoutDetail: r.payout_detail,
    note: r.note,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  }));
  res.json(orders);
});

// Create new order
router.post('/', async (req, res) => {
  const {
    customerId, supplierId, fromCurrency, toCurrency,
    fromAmount, toAmount, clientRate, supplierRate, profit,
    payoutMethod, payoutDetail, note,
  } = req.body;

  if (!customerId || !fromAmount || !clientRate) {
    return res.status(400).json({ error: 'Customer, amount and client rate required' });
  }

  const ref = genRef();
  const [order] = await db.execute(sql`
    INSERT INTO remittance_orders
      (reference, customer_id, supplier_id, from_currency, to_currency,
       from_amount, to_amount, client_rate, supplier_rate, profit,
       payout_method, payout_detail, note, status)
    VALUES
      (${ref}, ${parseInt(customerId)}, ${supplierId ? parseInt(supplierId) : null},
       ${fromCurrency}, ${toCurrency},
       ${parseFloat(fromAmount)}, ${parseFloat(toAmount || 0)},
       ${parseFloat(clientRate)}, ${parseFloat(supplierRate || 0)}, ${parseFloat(profit || 0)},
       ${payoutMethod || null}, ${payoutDetail || null}, ${note || null},
       'cash_received')
    RETURNING *
  `);
  res.json((order as any).rows?.[0] || order);
});

// Advance order to next stage
const STAGE_ORDER = ['cash_received', 'bb_deposited', 'sent_to_supplier', 'supplier_converting', 'completed'];

router.put('/:id/advance', async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { bbName, bbDepositRef, inCompanyAccountId, outCompanyAccountId, payoutMethod, payoutDetail, note } = req.body;

  // Get current status
  const result = await db.execute(sql`SELECT status FROM remittance_orders WHERE id = ${orderId}`);
  const order = (result.rows as any[])[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const currentIdx = STAGE_ORDER.indexOf(order.status);
  if (currentIdx < 0 || currentIdx >= STAGE_ORDER.length - 1) {
    return res.status(400).json({ error: 'Cannot advance order' });
  }
  const nextStatus = STAGE_ORDER[currentIdx + 1];

  const completedAt = nextStatus === 'completed' ? new Date() : null;

  await db.execute(sql`
    UPDATE remittance_orders SET
      status = ${nextStatus},
      bb_name = COALESCE(${bbName || null}, bb_name),
      bb_deposit_ref = COALESCE(${bbDepositRef || null}, bb_deposit_ref),
      in_company_account_id = COALESCE(${inCompanyAccountId ? parseInt(inCompanyAccountId) : null}, in_company_account_id),
      out_company_account_id = COALESCE(${outCompanyAccountId ? parseInt(outCompanyAccountId) : null}, out_company_account_id),
      payout_method = COALESCE(${payoutMethod || null}, payout_method),
      payout_detail = COALESCE(${payoutDetail || null}, payout_detail),
      note = CASE WHEN ${note || null} IS NOT NULL THEN CONCAT(COALESCE(note, ''), ' | ', ${note || ''}) ELSE note END,
      completed_at = ${completedAt}
    WHERE id = ${orderId}
  `);
  res.json({ ok: true, status: nextStatus });
});

// Cancel order
router.put('/:id/cancel', async (req, res) => {
  const orderId = parseInt(req.params.id);
  await db.execute(sql`UPDATE remittance_orders SET status = 'cancelled' WHERE id = ${orderId}`);
  res.json({ ok: true });
});

export default router;

// Catch async errors in this router
router.use((err: any, req: any, res: any, next: any) => {
  console.error(`Route error in ${req.method} ${req.path}:`, err?.message);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

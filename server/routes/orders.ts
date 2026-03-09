import { Router } from 'express';
import { db, pool } from '../db';
import { sql } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

function genRef() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${date}-${rand}`;
}

// List orders
router.get('/', async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT ro.*, c.name AS customer_name, s.name AS supplier_name,
        ca_in.name AS in_company_account_name, ca_out.name AS out_company_account_name
      FROM remittance_orders ro
      JOIN customers c ON ro.customer_id = c.id
      LEFT JOIN suppliers s ON ro.supplier_id = s.id
      LEFT JOIN company_accounts ca_in ON ro.in_company_account_id = ca_in.id
      LEFT JOIN company_accounts ca_out ON ro.out_company_account_id = ca_out.id
      ORDER BY ro.created_at DESC
    `);
    const rows = (result as any).rows || result;
    const orders = (rows as any[]).map(r => ({
      id: r.id, reference: r.reference,
      customerId: r.customer_id, customerName: r.customer_name,
      supplierId: r.supplier_id, supplierName: r.supplier_name,
      fromCurrency: r.from_currency, toCurrency: r.to_currency,
      fromAmount: r.from_amount, toAmount: r.to_amount,
      clientRate: r.client_rate, supplierRate: r.supplier_rate, profit: r.profit,
      status: r.status, bbName: r.bb_name, bbDepositRef: r.bb_deposit_ref,
      inCompanyAccountId: r.in_company_account_id, inCompanyAccountName: r.in_company_account_name,
      outCompanyAccountId: r.out_company_account_id, outCompanyAccountName: r.out_company_account_name,
      payoutMethod: r.payout_method, payoutDetail: r.payout_detail,
      note: r.note, createdAt: r.created_at, completedAt: r.completed_at,
    }));
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch orders' });
  }
});

// Create new order (Paper intake)
router.post('/', async (req, res) => {
  try {
    const {
      customerId, supplierId, fromCurrency, toCurrency,
      fromAmount, toAmount, clientRate, supplierRate, profit,
      bbName, bbDepositRef, payoutMethod, payoutDetail, note,
    } = req.body;

    if (!customerId || !fromAmount) {
      return res.status(400).json({ error: 'Customer and amount required' });
    }

    const ref = genRef();
    const result = await db.execute(sql`
      INSERT INTO remittance_orders
        (reference, customer_id, supplier_id, from_currency, to_currency,
         from_amount, to_amount, client_rate, supplier_rate, profit,
         bb_name, bb_deposit_ref, payout_method, payout_detail, note, status)
      VALUES
        (${ref}, ${parseInt(customerId)}, ${supplierId ? parseInt(supplierId) : null},
         ${fromCurrency || 'AUD'}, ${toCurrency || 'CNY'},
         ${parseFloat(fromAmount)}, ${parseFloat(toAmount || '0')},
         ${parseFloat(clientRate || '0')}, ${parseFloat(supplierRate || '0')}, ${parseFloat(profit || '0')},
         ${bbName || null}, ${bbDepositRef || null},
         ${payoutMethod || null}, ${payoutDetail || null}, ${note || null},
         'cash_received')
      RETURNING *
    `);
    const rows = (result as any).rows || result;
    res.json(Array.isArray(rows) ? rows[0] : rows);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create order' });
  }
});

// Advance order to next stage
const STAGE_ORDER = ['cash_received', 'bb_deposited', 'sent_to_supplier', 'supplier_converting', 'completed'];

router.put('/:id/advance', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { supplierId, bbName, bbDepositRef, inCompanyAccountId, outCompanyAccountId, payoutMethod, payoutDetail, note } = req.body;

    // Get current status
    const statusResult = await pool.query('SELECT status FROM remittance_orders WHERE id = $1', [orderId]);
    const order = statusResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const currentIdx = STAGE_ORDER.indexOf(order.status);
    if (currentIdx < 0 || currentIdx >= STAGE_ORDER.length - 1) {
      return res.status(400).json({ error: 'Cannot advance order from status: ' + order.status });
    }
    const nextStatus = STAGE_ORDER[currentIdx + 1];

    // Build SET clauses only for values that were actually provided
    const sets: string[] = ['status = $1'];
    const params: any[] = [nextStatus];
    let p = 2;

    if (supplierId)          { sets.push(`supplier_id = $${p++}`);           params.push(parseInt(supplierId)); }
    if (bbName)              { sets.push(`bb_name = $${p++}`);               params.push(bbName); }
    if (bbDepositRef)        { sets.push(`bb_deposit_ref = $${p++}`);        params.push(bbDepositRef); }
    if (inCompanyAccountId)  { sets.push(`in_company_account_id = $${p++}`); params.push(parseInt(inCompanyAccountId)); }
    if (outCompanyAccountId) { sets.push(`out_company_account_id = $${p++}`); params.push(parseInt(outCompanyAccountId)); }
    if (payoutMethod)        { sets.push(`payout_method = $${p++}`);         params.push(payoutMethod); }
    if (payoutDetail)        { sets.push(`payout_detail = $${p++}`);         params.push(payoutDetail); }
    if (note)                { sets.push(`note = CONCAT(COALESCE(note, ''), ' | ', $${p++})`); params.push(note); }
    if (nextStatus === 'completed') { sets.push('completed_at = NOW()'); }

    params.push(orderId);
    await pool.query(`UPDATE remittance_orders SET ${sets.join(', ')} WHERE id = $${p}`, params);

    res.json({ ok: true, status: nextStatus });
  } catch (e: any) {
    console.error('Advance order error:', e?.message);
    res.status(500).json({ error: e?.message || 'Failed to advance order' });
  }
});

// Split an order across multiple suppliers with specific amounts
// POST /orders/:id/split  body: { splits: [{ supplierId, amount, note }, ...], collectorName, collectorRef, inCompanyAccountId }
router.post('/:id/split', async (req, res) => {
  try {
    const parentId = parseInt(req.params.id);
    const { splits, collectorName, collectorRef, inCompanyAccountId } = req.body;

    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ error: 'At least one split required' });
    }
    for (const s of splits) {
      if (!s.supplierId || !s.amount || parseFloat(s.amount) <= 0) {
        return res.status(400).json({ error: 'Each split needs a supplier and a positive amount' });
      }
    }

    // Fetch parent order
    const parentResult = await pool.query('SELECT * FROM remittance_orders WHERE id = $1', [parentId]);
    const parent = parentResult.rows[0];
    if (!parent) return res.status(404).json({ error: 'Order not found' });
    if (parent.status !== 'cash_received') {
      return res.status(400).json({ error: 'Can only split orders at cash_received stage' });
    }

    // Validate total doesn't exceed parent amount
    const totalSplit = splits.reduce((s: number, sp: any) => s + parseFloat(sp.amount), 0);
    const parentAmount = parseFloat(parent.from_amount);
    if (totalSplit > parentAmount + 0.01) {
      return res.status(400).json({ error: `Split total (${totalSplit}) exceeds order amount (${parentAmount})` });
    }

    // Create child orders, one per supplier
    const created = [];
    for (const split of splits) {
      const ref = genRef();
      const result = await pool.query(`
        INSERT INTO remittance_orders
          (reference, customer_id, supplier_id, from_currency, to_currency,
           from_amount, to_amount, client_rate, supplier_rate, profit,
           bb_name, bb_deposit_ref, in_company_account_id, note, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'sent_to_supplier')
        RETURNING *`,
        [
          ref,
          parent.customer_id,
          parseInt(split.supplierId),
          parent.from_currency,
          parent.to_currency,
          parseFloat(split.amount),
          0,
          parent.client_rate || 0,
          parent.supplier_rate || 0,
          0,
          collectorName || parent.bb_name || null,
          collectorRef || parent.bb_deposit_ref || null,
          inCompanyAccountId ? parseInt(inCompanyAccountId) : (parent.in_company_account_id || null),
          split.note || parent.note || null,
        ]
      );
      created.push(result.rows[0]);
    }

    // Mark parent as split/cancelled — it's been dispatched
    await pool.query(
      `UPDATE remittance_orders SET status = 'cancelled', note = CONCAT(COALESCE(note,''), ' [split into ${splits.length} orders]') WHERE id = $1`,
      [parentId]
    );

    res.json({ ok: true, created });
  } catch (e: any) {
    console.error('Split order error:', e?.message);
    res.status(500).json({ error: e?.message || 'Failed to split order' });
  }
});

// Cancel order
router.put('/:id/cancel', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    await db.execute(sql`UPDATE remittance_orders SET status = 'cancelled' WHERE id = ${orderId}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to cancel order' });
  }
});

export default router;

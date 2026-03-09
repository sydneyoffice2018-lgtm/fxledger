/**
 * STEP 1: PAPER
 * Client brings paper → record it → split across suppliers with specific amounts
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCY_COLORS } from '../lib/api';
import { Card, Btn, Input, Select, Modal, Table, TR, TD, toast } from '../components/ui';

const STEP_COLOR = '#f59e0b';
const SUPPLIER_COLOR = '#8b5cf6';

interface SplitRow {
  supplierId: string;
  amount: string;
  note: string;
}

export function PaperPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [sendingOrder, setSendingOrder] = useState<any>(null);

  const [form, setForm] = useState({
    customerId: '', currency: 'AUD', amount: '',
    collectorName: '', collectorRef: '', note: '',
  });

  // Split dispatch state
  const [collectorName, setCollectorName] = useState('');
  const [collectorRef, setCollectorRef]   = useState('');
  const [inAccountId, setInAccountId]     = useState('');
  const [splits, setSplits] = useState<SplitRow[]>([{ supplierId: '', amount: '', note: '' }]);

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });
  const { data: orders = [] }    = useQuery<any[]>({ queryKey: ['orders'],    queryFn: () => api.get('/orders').then(r => r.data) });
  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });
  const { data: accounts = [] }  = useQuery<any[]>({ queryKey: ['accounts'],  queryFn: () => api.get('/accounts').then(r => r.data) });

  const paperOrders = (orders as any[]).filter(o => o.status === 'cash_received');
  const audAccounts = (accounts as any[]).filter((a: any) => a.active && a.currency === 'AUD');

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const openSendModal = (order: any) => {
    setSendingOrder(order);
    setCollectorName(order.bbName || '');
    setCollectorRef(order.bbDepositRef || '');
    setInAccountId(order.inCompanyAccountId?.toString() || '');
    // Pre-fill single row with full amount
    setSplits([{ supplierId: '', amount: String(order.fromAmount), note: '' }]);
  };

  // Derived: total allocated and remainder
  const totalAllocated = splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalAvailable = parseFloat(sendingOrder?.fromAmount || '0');
  const remaining = totalAvailable - totalAllocated;
  const isOver = remaining < -0.01;
  const allValid = splits.length > 0 && splits.every(r => r.supplierId && parseFloat(r.amount) > 0) && !isOver;

  const addRow = () => setSplits(p => [...p, { supplierId: '', amount: remaining > 0 ? remaining.toFixed(2) : '', note: '' }]);
  const removeRow = (i: number) => setSplits(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, k: keyof SplitRow, v: string) =>
    setSplits(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const createMut = useMutation({
    mutationFn: () => api.post('/orders', {
      customerId: form.customerId,
      fromCurrency: form.currency,
      toCurrency: 'CNY',
      fromAmount: form.amount,
      clientRate: '0',
      bbName: form.collectorName,
      bbDepositRef: form.collectorRef,
      note: form.note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setShowNew(false);
      toast('Paper intake recorded');
      setForm({ customerId: '', currency: 'AUD', amount: '', collectorName: '', collectorRef: '', note: '' });
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed to record intake', 'error'),
  });

  const splitMut = useMutation({
    mutationFn: () => api.post(`/orders/${sendingOrder.id}/split`, {
      splits: splits.map(r => ({ supplierId: r.supplierId, amount: r.amount, note: r.note || undefined })),
      collectorName: collectorName || undefined,
      collectorRef: collectorRef || undefined,
      inCompanyAccountId: inAccountId || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSendingOrder(null);
      const n = res.data?.created?.length || splits.length;
      toast(`✓ Dispatched to ${n} supplier${n > 1 ? 's' : ''}`);
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed to dispatch', 'error'),
  });

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: STEP_COLOR + '20', border: `1.5px solid ${STEP_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: STEP_COLOR }}>1</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: STEP_COLOR, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Step 1 of 5</div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>Paper Intake</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Record paper from client → split across suppliers as needed</p>
        </div>
        <Btn onClick={() => setShowNew(true)} style={{ background: STEP_COLOR, color: '#0c0e12' }}>
          + Record Paper
        </Btn>
      </div>

      {/* Flow indicator */}
      <div style={{ background: 'var(--surface)', border: `1px solid ${STEP_COLOR}30`, borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 20 }}>💵</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Client gives you paper (cash)</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Record intake → collector deposits to your bank → split & dispatch to one or more suppliers</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: STEP_COLOR }}>{paperOrders.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>ready to dispatch</div>
        </div>
      </div>

      {/* Orders table */}
      {paperOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💵</div>
          <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>No paper orders waiting</div>
          <div style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 20 }}>Record a new paper intake when a client arrives</div>
          <Btn onClick={() => setShowNew(true)} style={{ background: STEP_COLOR, color: '#0c0e12' }}>Record Paper</Btn>
        </Card>
      ) : (
        <Table headers={['Client', 'Total Amount', 'Collector', 'Received', 'Actions']}>
          {paperOrders.map((o: any) => (
            <TR key={o.id}>
              <TD><span style={{ fontWeight: 600 }}>{o.customerName}</span></TD>
              <TD mono><span style={{ color: STEP_COLOR, fontWeight: 700 }}>{fmt(o.fromAmount)} {o.fromCurrency}</span></TD>
              <TD>{o.bbName || <span style={{ color: 'var(--text4)' }}>—</span>}</TD>
              <TD muted>{new Date(o.createdAt).toLocaleDateString('en-AU')}</TD>
              <TD>
                <Btn size="sm" onClick={() => openSendModal(o)}
                  style={{ background: SUPPLIER_COLOR + '20', color: SUPPLIER_COLOR, border: `1px solid ${SUPPLIER_COLOR}30` }}>
                  → Dispatch to Supplier(s)
                </Btn>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {/* ── Record Paper Intake Modal ── */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Record Paper Intake">
        <Select label="Client *" value={form.customerId} onChange={f('customerId')}>
          <option value="">— Select client —</option>
          {(customers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Amount *" type="number" value={form.amount} onChange={f('amount')} placeholder="e.g. 10000" />
          <Select label="Currency" value={form.currency} onChange={f('currency')}>
            {['AUD', 'USD', 'CNY', 'HKD', 'USDT'].map(c => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <Input label="Cash Collector Name" value={form.collectorName} onChange={f('collectorName')} placeholder="Who will collect this paper?" />
        <Input label="Collector Reference" value={form.collectorRef} onChange={f('collectorRef')} placeholder="Receipt or reference number" />
        <Input label="Note" value={form.note} onChange={f('note')} placeholder="Optional notes" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowNew(false)}>Cancel</Btn>
          <Btn loading={createMut.isPending} onClick={() => createMut.mutate()}
            disabled={!form.customerId || !form.amount} style={{ background: STEP_COLOR, color: '#0c0e12' }}>
            Record Intake
          </Btn>
        </div>
      </Modal>

      {/* ── Dispatch to Supplier(s) Modal ── */}
      {sendingOrder && (
        <Modal open onClose={() => setSendingOrder(null)} title="Dispatch to Supplier(s)" width={620}>

          {/* Order summary bar */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{sendingOrder.customerName}</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>Ref: {sendingOrder.reference}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", color: STEP_COLOR, fontWeight: 800, fontSize: 18 }}>
                {fmt(sendingOrder.fromAmount)} {sendingOrder.fromCurrency}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text4)' }}>total to dispatch</div>
            </div>
          </div>

          {/* Collector info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Input label="Cash Collector Name" value={collectorName} onChange={e => setCollectorName(e.target.value)} placeholder="Who deposited?" />
            <Input label="Collector Reference" value={collectorRef} onChange={e => setCollectorRef(e.target.value)} placeholder="Bank ref / receipt" />
          </div>
          {audAccounts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Select label="Deposited into our account" value={inAccountId} onChange={e => setInAccountId(e.target.value)}>
                <option value="">— Select account (optional) —</option>
                {audAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}{a.accountNumber ? ` · ${a.accountNumber}` : ''}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />

          {/* Supplier split rows */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Split Across Suppliers
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {splits.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 10, alignItems: 'end' }}>
                {/* Supplier dropdown */}
                <div>
                  {i === 0 && <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 5 }}>SUPPLIER</div>}
                  <select
                    value={row.supplierId}
                    onChange={e => updateRow(i, 'supplierId', e.target.value)}
                    style={{
                      width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', padding: '9px 12px', fontSize: 13,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  >
                    <option value="">— Select supplier —</option>
                    {(suppliers as any[]).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  {i === 0 && <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 5 }}>AMOUNT ({sendingOrder.fromCurrency})</div>}
                  <input
                    type="number"
                    value={row.amount}
                    onChange={e => updateRow(i, 'amount', e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', padding: '9px 12px', fontSize: 13,
                      outline: 'none', fontFamily: "'JetBrains Mono',monospace", boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeRow(i)}
                  disabled={splits.length === 1}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                    color: splits.length === 1 ? 'var(--text4)' : '#ef4444',
                    cursor: splits.length === 1 ? 'default' : 'pointer',
                    padding: '9px 12px', fontSize: 13, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add supplier row button */}
          <button
            onClick={addRow}
            style={{
              background: 'none', border: `1px dashed ${SUPPLIER_COLOR}60`,
              borderRadius: 8, color: SUPPLIER_COLOR, cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontWeight: 600, width: '100%',
              marginBottom: 16, fontFamily: 'inherit',
            }}
          >
            + Add Another Supplier
          </button>

          {/* Running total */}
          <div style={{
            background: isOver ? '#ef444415' : remaining === 0 ? '#22c55e15' : 'var(--surface2)',
            border: `1px solid ${isOver ? '#ef4444' : remaining === 0 ? '#22c55e' : 'var(--border)'}40`,
            borderRadius: 10, padding: '10px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {isOver
                ? `⚠️ Over by ${fmt(Math.abs(remaining))} ${sendingOrder.fromCurrency}`
                : remaining === 0
                ? '✅ Fully allocated'
                : `Remaining: ${fmt(remaining)} ${sendingOrder.fromCurrency}`}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14,
              color: isOver ? '#ef4444' : remaining === 0 ? '#22c55e' : 'var(--text)' }}>
              {fmt(totalAllocated)} / {fmt(totalAvailable)}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setSendingOrder(null)}>Cancel</Btn>
            <Btn
              loading={splitMut.isPending}
              onClick={() => splitMut.mutate()}
              disabled={!allValid}
              style={{ background: SUPPLIER_COLOR, color: '#fff', fontWeight: 700 }}
            >
              Dispatch {splits.length > 1 ? `(${splits.length} suppliers)` : 'to Supplier'} →
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

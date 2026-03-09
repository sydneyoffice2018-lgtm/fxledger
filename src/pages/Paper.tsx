/**
 * STEP 1: PAPER
 * Client brings paper → record it → assign collector → send to supplier
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCY_COLORS } from '../lib/api';
import { Card, Btn, Input, Select, Modal, Table, TR, TD, toast } from '../components/ui';

const STEP_COLOR = '#f59e0b';
const SUPPLIER_COLOR = '#8b5cf6';

export function PaperPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [sendingOrder, setSendingOrder] = useState<any>(null);

  const [form, setForm] = useState({
    customerId: '', currency: 'AUD', amount: '',
    collectorName: '', collectorRef: '', note: '',
  });

  const [sendForm, setSendForm] = useState({
    supplierId: '',
    collectorName: '',
    collectorRef: '',
    inCompanyAccountId: '',
    note: '',
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  });
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
  });
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data),
  });
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  });

  const paperOrders = (orders as any[]).filter(o => o.status === 'cash_received');

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const sf = (k: string) => (e: any) => setSendForm(p => ({ ...p, [k]: e.target.value }));

  const openSendModal = (order: any) => {
    setSendingOrder(order);
    setSendForm({
      supplierId: order.supplierId?.toString() || '',
      collectorName: order.bbName || '',
      collectorRef: order.bbDepositRef || '',
      inCompanyAccountId: order.inCompanyAccountId?.toString() || '',
      note: '',
    });
  };

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

  const sendMut = useMutation({
    mutationFn: () => {
      if (!sendForm.supplierId) throw new Error('Please select a supplier');
      return api.put(`/orders/${sendingOrder.id}/advance`, {
        supplierId: sendForm.supplierId,
        bbName: sendForm.collectorName || undefined,
        bbDepositRef: sendForm.collectorRef || undefined,
        inCompanyAccountId: sendForm.inCompanyAccountId || undefined,
        note: sendForm.note || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSendingOrder(null);
      toast('Order sent to supplier ✓');
    },
    onError: (e: any) => toast(e?.response?.data?.error || e?.message || 'Failed to send', 'error'),
  });

  const audAccounts = (accounts as any[]).filter((a: any) => a.active && a.currency === 'AUD');

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
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Client hands over paper → record it → pass to collector for bank deposit</p>
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
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Record the intake → hand to cash collector → they deposit to your bank → send to supplier</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: STEP_COLOR }}>{paperOrders.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>awaiting collector</div>
        </div>
      </div>

      {/* Orders at this stage */}
      {paperOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💵</div>
          <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>No paper orders waiting</div>
          <div style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 20 }}>Record a new paper intake when a client arrives</div>
          <Btn onClick={() => setShowNew(true)} style={{ background: STEP_COLOR, color: '#0c0e12' }}>Record Paper</Btn>
        </Card>
      ) : (
        <Table headers={['Client', 'Amount', 'Collector', 'Received', 'Actions']}>
          {paperOrders.map((o: any) => (
            <TR key={o.id}>
              <TD><span style={{ fontWeight: 600 }}>{o.customerName}</span></TD>
              <TD mono><span style={{ color: STEP_COLOR }}>{fmt(o.fromAmount)} {o.fromCurrency}</span></TD>
              <TD>{o.bbName || <span style={{ color: 'var(--text4)' }}>—</span>}</TD>
              <TD muted>{new Date(o.createdAt).toLocaleDateString('en-AU')}</TD>
              <TD>
                <Btn
                  size="sm"
                  onClick={() => openSendModal(o)}
                  style={{ background: SUPPLIER_COLOR + '20', color: SUPPLIER_COLOR, border: `1px solid ${SUPPLIER_COLOR}30` }}
                >
                  → Send to Supplier
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
          <Input label="Amount *" type="number" value={form.amount} onChange={f('amount')} placeholder="e.g. 50000" />
          <Select label="Currency" value={form.currency} onChange={f('currency')}>
            {['AUD', 'USD', 'CNY', 'HKD', 'USDT'].map(c => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <Input label="Cash Collector Name" value={form.collectorName} onChange={f('collectorName')} placeholder="Who will collect this paper?" />
        <Input label="Collector Reference" value={form.collectorRef} onChange={f('collectorRef')} placeholder="Receipt or reference number" />
        <Input label="Note" value={form.note} onChange={f('note')} placeholder="Optional notes" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowNew(false)}>Cancel</Btn>
          <Btn
            loading={createMut.isPending}
            onClick={() => createMut.mutate()}
            disabled={!form.customerId || !form.amount}
            style={{ background: STEP_COLOR, color: '#0c0e12' }}
          >
            Record Intake
          </Btn>
        </div>
      </Modal>

      {/* ── Send to Supplier Modal ── */}
      {sendingOrder && (
        <Modal open onClose={() => setSendingOrder(null)} title="Send to Supplier">
          {/* Order summary */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{sendingOrder.customerName}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: STEP_COLOR, fontWeight: 700 }}>
                {fmt(sendingOrder.fromAmount)} {sendingOrder.fromCurrency}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>Ref: {sendingOrder.reference}</div>
          </div>

          {/* Supplier selection */}
          <Select label="Supplier *" value={sendForm.supplierId} onChange={sf('supplierId')}>
            <option value="">— Select supplier —</option>
            {(suppliers as any[]).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}{s.contact ? ` (${s.contact})` : ''}</option>
            ))}
          </Select>

          {/* Collector info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Collector Name" value={sendForm.collectorName} onChange={sf('collectorName')} placeholder="Who deposited?" />
            <Input label="Collector Reference" value={sendForm.collectorRef} onChange={sf('collectorRef')} placeholder="Bank ref / receipt" />
          </div>

          {/* Our bank account (where money was deposited) */}
          {audAccounts.length > 0 && (
            <Select label="Deposited into our account" value={sendForm.inCompanyAccountId} onChange={sf('inCompanyAccountId')}>
              <option value="">— Select account (optional) —</option>
              {audAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}{a.accountNumber ? ` · ${a.accountNumber}` : ''}</option>
              ))}
            </Select>
          )}

          <Input label="Note" value={sendForm.note} onChange={sf('note')} placeholder="Optional notes" />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setSendingOrder(null)}>Cancel</Btn>
            <Btn
              loading={sendMut.isPending}
              onClick={() => sendMut.mutate()}
              disabled={!sendForm.supplierId}
              style={{ background: SUPPLIER_COLOR, color: '#fff', fontWeight: 700 }}
            >
              Send to Supplier →
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

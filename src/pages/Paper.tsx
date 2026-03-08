/**
 * STEP 1: PAPER
 * Client brings paper → we record it → assign to collector for deposit
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCY_COLORS } from '../lib/api';
import { Card, Btn, Input, Select, Modal, Table, TR, TD, toast } from '../components/ui';

const STEP_COLOR = '#f59e0b';

export function PaperPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    customerId: '', currency: 'AUD', amount: '',
    collectorName: '', collectorRef: '', note: '',
  });

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ['orders'], queryFn: () => api.get('/orders').then(r => r.data) });

  const paperOrders = (orders as any[]).filter(o => o.status === 'cash_received');

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

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

  const advanceMut = useMutation({
    mutationFn: (id: number) => api.put(`/orders/${id}/advance`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast('Advanced to next stage'); },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed to advance', 'error'),
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
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Record the intake → hand to cash collector → they deposit to your bank → move to Step 2</div>
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
                <Btn size="sm" onClick={() => advanceMut.mutate(o.id)} style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf630' }}>
                  → Supplier
                </Btn>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {/* New intake modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Record Paper Intake">
        <Select label="Client *" value={form.customerId} onChange={f('customerId')}>
          <option value="">— Select client —</option>
          {(customers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Amount *" type="number" value={form.amount} onChange={f('amount')} placeholder="e.g. 50000" />
          <Select label="Currency" value={form.currency} onChange={f('currency')}>
            {['AUD','USD','CNY','HKD','USDT'].map(c => <option key={c}>{c}</option>)}
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
    </div>
  );
}

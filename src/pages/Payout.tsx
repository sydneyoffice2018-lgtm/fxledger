/**
 * STEP 5: PAYOUT
 * Final step — pay client their converted funds
 * Client receives: bank transfer (AUD/CNY), USDT wallet, or paper
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCY_COLORS } from '../lib/api';
import { Card, Btn, Input, Select, Modal, Table, TR, TD, Badge, toast } from '../components/ui';

const STEP_COLOR = '#22c55e';

export function PayoutPage() {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState<any>(null);
  const [form, setForm] = useState({ payoutMethod: 'bank_transfer', payoutDetail: '', outCompanyAccountId: '', note: '' });

  const { data: orders = [] } = useQuery<any[]>({ queryKey: ['orders'], queryFn: () => api.get('/orders').then(r => r.data) });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ['accounts'], queryFn: () => api.get('/accounts').then(r => r.data) });

  const readyOrders = (orders as any[]).filter(o => o.status === 'supplier_converting');
  const completedToday = (orders as any[]).filter(o => {
    if (o.status !== 'completed') return false;
    const d = new Date(o.completedAt || o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const completeMut = useMutation({
    mutationFn: () => api.put(`/orders/${completing.id}/advance`, {
      payoutMethod: form.payoutMethod,
      payoutDetail: form.payoutDetail,
      outCompanyAccountId: form.outCompanyAccountId || null,
      note: form.note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setCompleting(null);
      toast('✅ Payout completed!');
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed', 'error'),
  });

  const payoutLabel: Record<string, string> = {
    bank_transfer: '🏦 Bank Transfer',
    usdt_wallet:   '₿ USDT Wallet',
    cash:          '💵 Paper',
  };

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: STEP_COLOR + '20', border: `1.5px solid ${STEP_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: STEP_COLOR }}>5</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: STEP_COLOR, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Step 5 of 5</div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>Client Payout</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Send converted funds to client's bank account or USDT wallet</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: `1px solid ${STEP_COLOR}30`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Ready to Pay Out</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: STEP_COLOR }}>{readyOrders.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Supplier has converted — waiting for payout</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Completed Today</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: 'var(--text)' }}>{completedToday.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Payouts sent today</div>
        </div>
      </div>

      {/* Ready orders */}
      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Ready for Payout</h3>

      {readyOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>✅</div>
          <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>No orders ready for payout</div>
          <div style={{ fontSize: 13, color: 'var(--text4)' }}>Orders appear here once supplier has converted the funds</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {readyOrders.map((o: any) => (
            <Card key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{o.customerName}</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>
                    <span style={{ color: CURRENCY_COLORS[o.fromCurrency] || 'var(--text)' }}>{fmt(o.fromAmount)} {o.fromCurrency}</span>
                    <span style={{ margin: '0 8px', color: 'var(--text4)' }}>→</span>
                    <span style={{ color: CURRENCY_COLORS[o.toCurrency] || 'var(--text)', fontWeight: 700 }}>{fmt(o.toAmount)} {o.toCurrency}</span>
                  </div>
                  {o.payoutDetail && (
                    <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                      {payoutLabel[o.payoutMethod] || o.payoutMethod}: {o.payoutDetail}
                    </div>
                  )}
                </div>
                <Btn
                  onClick={() => { setCompleting(o); setForm({ payoutMethod: o.payoutMethod || 'bank_transfer', payoutDetail: o.payoutDetail || '', outCompanyAccountId: o.outCompanyAccountId?.toString() || '', note: '' }); }}
                  style={{ background: STEP_COLOR, color: '#0c0e12', fontWeight: 700 }}
                >
                  Pay Out →
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Completed today */}
      {completedToday.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Completed Today</h3>
          <Table headers={['Client', 'They Received', 'Method', 'Time']}>
            {completedToday.map((o: any) => (
              <TR key={o.id}>
                <TD><span style={{ fontWeight: 600 }}>{o.customerName}</span></TD>
                <TD mono><span style={{ color: STEP_COLOR, fontWeight: 700 }}>+{fmt(o.toAmount)} {o.toCurrency}</span></TD>
                <TD>{payoutLabel[o.payoutMethod] || '—'}</TD>
                <TD muted>{new Date(o.completedAt || o.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</TD>
              </TR>
            ))}
          </Table>
        </>
      )}

      {/* Complete payout modal */}
      {completing && (
        <Modal open onClose={() => setCompleting(null)} title={`Pay Out: ${completing.customerName}`}>
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Amount to send</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: STEP_COLOR }}>
              {fmt(completing.toAmount)} {completing.toCurrency}
            </div>
          </div>
          <Select label="Payout Method" value={form.payoutMethod} onChange={f('payoutMethod')}>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="usdt_wallet">₿ USDT Wallet</option>
            <option value="cash">💵 Paper</option>
          </Select>
          {form.payoutMethod !== 'cash' && (
            <Input
              label={form.payoutMethod === 'bank_transfer' ? "Client's BSB + Account Number" : "Client's USDT Wallet Address"}
              value={form.payoutDetail}
              onChange={f('payoutDetail')}
              placeholder={form.payoutMethod === 'bank_transfer' ? '012-345  123456789' : '0x...'}
            />
          )}
          {form.payoutMethod === 'bank_transfer' && (
            <Select label="Send From (our account)" value={form.outCompanyAccountId} onChange={f('outCompanyAccountId')}>
              <option value="">— Supplier pays direct —</option>
              {(accounts as any[]).filter((a: any) => a.currency === completing.toCurrency && a.active).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}{a.accountNumber ? ` (${a.accountNumber})` : ''}</option>
              ))}
            </Select>
          )}
          <Input label="Note" value={form.note} onChange={f('note')} placeholder="Optional" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setCompleting(null)}>Cancel</Btn>
            <Btn loading={completeMut.isPending} onClick={() => completeMut.mutate()} style={{ background: STEP_COLOR, color: '#0c0e12', fontWeight: 700 }}>
              ✅ Mark as Paid Out
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

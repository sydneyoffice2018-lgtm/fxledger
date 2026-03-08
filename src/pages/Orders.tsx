/**
 * ORDERS — The core workflow page
 * Each order tracks a remittance job through all stages:
 *
 * Stage 1: CASH IN     — Client gives paper → you receive it → record with BB details
 * Stage 2: BB DEPOSIT  — BB collects paper → transfers to your company bank account
 * Stage 3: SEND TO SUPPLIER — You send funds to supplier (AUD → supplier)
 * Stage 4: SUPPLIER CONVERTS — Supplier does the exchange (AUD→USDT or AUD→RMB etc)
 * Stage 5: PAYOUT      — Supplier pays client's bank/wallet
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCY_COLORS } from '../lib/api';
import { Card, Btn, Input, Select, PageHeader, Modal, toast } from '../components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'cash_received' | 'bb_deposited' | 'sent_to_supplier' | 'supplier_converting' | 'completed' | 'cancelled';

interface RemittanceOrder {
  id: number;
  reference: string;
  customerId: number;
  customerName: string;
  supplierId?: number;
  supplierName?: string;
  // Amounts
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  clientRate: string;       // rate given to client
  supplierRate: string;     // rate from supplier
  profit: string;
  // Settlement
  status: OrderStatus;
  bbName?: string;          // who collected the cash
  bbDepositRef?: string;    // BB's deposit reference/receipt
  inCompanyAccountId?: number;
  inCompanyAccountName?: string;
  // Payout
  payoutMethod?: 'bank_transfer' | 'usdt_wallet' | 'cash';
  payoutDetail?: string;    // BSB+acc, wallet address, or "cash"
  outCompanyAccountId?: number;
  outCompanyAccountName?: string;
  note?: string;
  createdAt: string;
  completedAt?: string;
}

// ── Status config ──────────────────────────────────────────────────────────────

const STAGES: { status: OrderStatus; label: string; icon: string; color: string; description: string }[] = [
  { status: 'cash_received',       icon: '💵', label: 'Paper Received',      color: '#f59e0b', description: 'Client handed over paper' },
  { status: 'bb_deposited',        icon: '🏧', label: 'BB Deposited',        color: '#3b82f6', description: 'BB transferred to our account' },
  { status: 'sent_to_supplier',    icon: '📤', label: 'Sent to Supplier',    color: '#8b5cf6', description: 'We wired funds to supplier' },
  { status: 'supplier_converting', icon: '🔄', label: 'Supplier Converting', color: '#06b6d4', description: 'Supplier doing the exchange' },
  { status: 'completed',           icon: '✅', label: 'Completed',           color: '#10b981', description: 'Client received funds' },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') return <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#ef444422', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cancelled</span>;
  const s = STAGES.find(x => x.status === status);
  if (!s) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.color + '22', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {s.icon} {s.label}
    </span>
  );
}

function StageProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') return null;
  const currentIdx = STAGES.findIndex(s => s.status === status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '12px 0 0' }}>
      {STAGES.map((s, i) => (
        <div key={s.status} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              background: i <= currentIdx ? s.color : 'var(--surface2)',
              color: i <= currentIdx ? '#fff' : 'var(--text3)',
              border: `2px solid ${i <= currentIdx ? s.color : 'var(--border)'}`,
              transition: 'all 0.3s',
            }}>
              {i < currentIdx ? '✓' : s.icon}
            </div>
            <div style={{ fontSize: 9, color: i <= currentIdx ? s.color : 'var(--text3)', marginTop: 3, fontWeight: i === currentIdx ? 700 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>
              {s.label}
            </div>
          </div>
          {i < STAGES.length - 1 && (
            <div style={{ height: 2, flex: 0.5, background: i < currentIdx ? '#10b981' : 'var(--border)', margin: '0 2px', marginBottom: 18 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Advance stage modal ────────────────────────────────────────────────────────

function AdvanceStageModal({ order, onClose }: { order: RemittanceOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const currentIdx = STAGES.findIndex(s => s.status === order.status);
  const nextStage = STAGES[currentIdx + 1];

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ['accounts'], queryFn: () => api.get('/accounts').then(r => r.data) });

  const [bbName, setBbName] = useState(order.bbName || '');
  const [bbDepositRef, setBbDepositRef] = useState(order.bbDepositRef || '');
  const [inCompanyAccountId, setInCompanyAccountId] = useState(order.inCompanyAccountId?.toString() || '');
  const [outCompanyAccountId, setOutCompanyAccountId] = useState(order.outCompanyAccountId?.toString() || '');
  const [payoutMethod, setPayoutMethod] = useState<string>(order.payoutMethod || 'bank_transfer');
  const [payoutDetail, setPayoutDetail] = useState(order.payoutDetail || '');
  const [note, setNote] = useState('');

  const mut = useMutation({
    mutationFn: () => api.put(`/orders/${order.id}/advance`, {
      bbName, bbDepositRef,
      inCompanyAccountId: inCompanyAccountId || null,
      outCompanyAccountId: outCompanyAccountId || null,
      payoutMethod, payoutDetail, note,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); onClose(); toast(`Order advanced to: ${nextStage?.label}`); },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed', 'error'),
  });

  if (!nextStage) return null;

  return (
    <Modal open onClose={onClose} title={`Advance to: ${nextStage.icon} ${nextStage.label}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: nextStage.color + '15', border: `1px solid ${nextStage.color}40`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>
          {nextStage.description}
        </div>

        {/* Stage-specific fields */}
        {nextStage.status === 'bb_deposited' && (
          <>
            <Input label="BB Name / Collector" value={bbName} onChange={e => setBbName(e.target.value)} placeholder="Who collected the paper?" />
            <Input label="BB Deposit Reference" value={bbDepositRef} onChange={e => setBbDepositRef(e.target.value)} placeholder="BB's receipt or transfer ref" />
            <Select label={`Deposited into (${order.fromCurrency} account)`} value={inCompanyAccountId} onChange={e => setInCompanyAccountId(e.target.value)}>
              <option value="">— Select company account —</option>
              {(accounts as any[]).filter(a => a.currency === order.fromCurrency && a.active).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}{a.accountNumber ? ` (${a.accountNumber})` : ''}</option>
              ))}
            </Select>
          </>
        )}

        {nextStage.status === 'sent_to_supplier' && (
          <Select label={`Sent from (${order.fromCurrency} account)`} value={outCompanyAccountId} onChange={e => setOutCompanyAccountId(e.target.value)}>
            <option value="">— Select company account —</option>
            {(accounts as any[]).filter(a => a.currency === order.fromCurrency && a.active).map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}{a.accountNumber ? ` (${a.accountNumber})` : ''}</option>
            ))}
          </Select>
        )}

        {nextStage.status === 'completed' && (
          <>
            <Select label="Payout Method" value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}>
              <option value="bank_transfer">🏦 Bank Transfer (client's bank account)</option>
              <option value="usdt_wallet">₿ USDT Wallet</option>
              <option value="cash">💵 Paper Payout</option>
            </Select>
            {payoutMethod !== 'cash' && (
              <Input
                label={payoutMethod === 'bank_transfer' ? 'Client Bank BSB + Account' : 'USDT Wallet Address'}
                value={payoutDetail}
                onChange={e => setPayoutDetail(e.target.value)}
                placeholder={payoutMethod === 'bank_transfer' ? 'e.g. 012-345  123456789' : '0x...'}
              />
            )}
            {payoutMethod === 'bank_transfer' && (
              <Select label={`Paid from (${order.toCurrency} account)`} value={outCompanyAccountId} onChange={e => setOutCompanyAccountId(e.target.value)}>
                <option value="">— No company account (supplier paid direct) —</option>
                {(accounts as any[]).filter(a => a.currency === order.toCurrency && a.active).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}{a.accountNumber ? ` (${a.accountNumber})` : ''}</option>
                ))}
              </Select>
            )}
          </>
        )}

        <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="Any notes for this stage…" />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn loading={mut.isPending} onClick={() => mut.mutate()} style={{ background: nextStage.color }}>
            Advance → {nextStage.label}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── New order modal ────────────────────────────────────────────────────────────

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customerId: '', supplierId: '',
    fromCurrency: 'AUD', toCurrency: 'CNY',
    fromAmount: '', toAmount: '',
    clientRate: '', supplierRate: '',
    payoutMethod: 'bank_transfer',
    payoutDetail: '',
    note: '',
  });

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });
  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });

  const CURRENCIES = ['AUD', 'CNY', 'USD', 'USDT', 'HKD'];

  // Auto-calc
  const cr = parseFloat(form.clientRate) || 0;
  const sr = parseFloat(form.supplierRate) || 0;
  const fa = parseFloat(form.fromAmount) || 0;
  const toAmt = fa > 0 && cr > 0 ? (fa * cr).toFixed(2) : '';
  const profitInTo = fa > 0 && cr > 0 && sr > 0 ? (sr - cr) * fa : 0;
  const marketRate = (rates as any[]).find(r => r.fromCurrency === form.fromCurrency && r.toCurrency === form.toCurrency);

  const mut = useMutation({
    mutationFn: () => api.post('/orders', {
      ...form,
      toAmount: toAmt,
      profit: sr > 0 && cr > 0 ? (profitInTo / sr).toFixed(4) : '0',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); onClose(); toast('Order created!'); },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed', 'error'),
  });

  const f = (k: string) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Modal open onClose={onClose} title="New Remittance Order" wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Order Details</h4>
          <Select label="Client *" value={form.customerId} onChange={f('customerId')}>
            <option value="">— Select client —</option>
            {(customers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Supplier" value={form.supplierId} onChange={f('supplierId')}>
            <option value="">— Select supplier (optional) —</option>
            {(suppliers as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Client gives" value={form.fromCurrency} onChange={f('fromCurrency')}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Client gets" value={form.toCurrency} onChange={f('toCurrency')}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <Input label={`Amount (${form.fromCurrency})`} type="number" value={form.fromAmount} onChange={f('fromAmount')} placeholder="e.g. 100000" />

          <h4 style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rates</h4>
          <Input label={`Client Rate (we give client per 1 ${form.fromCurrency})`} type="number" step="0.000001" value={form.clientRate} onChange={f('clientRate')} placeholder="e.g. 4.85" />
          <Input label={`Supplier Rate (supplier gives us per 1 ${form.fromCurrency})`} type="number" step="0.000001" value={form.supplierRate} onChange={f('supplierRate')} placeholder="e.g. 4.90" />
          {marketRate && <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>📊 Market rate: {parseFloat(marketRate.rate).toFixed(4)}</p>}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payout</h4>
          <Select label="Payout Method" value={form.payoutMethod} onChange={f('payoutMethod')}>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="usdt_wallet">₿ USDT Wallet</option>
            <option value="cash">💵 Paper</option>
          </Select>
          {form.payoutMethod !== 'cash' && (
            <Input
              label={form.payoutMethod === 'bank_transfer' ? 'Client Bank BSB + Account' : 'USDT Wallet Address'}
              value={form.payoutDetail}
              onChange={f('payoutDetail')}
              placeholder={form.payoutMethod === 'bank_transfer' ? 'e.g. 012-345  123456789' : '0x...'}
            />
          )}
          <Input label="Note (optional)" value={form.note} onChange={f('note')} placeholder="Any notes…" />

          {/* Preview */}
          {fa > 0 && cr > 0 && (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Preview</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Client gives</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(fa)} {form.fromCurrency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Client gets ({cr} rate)</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(toAmt)} {form.toCurrency}</span>
              </div>
              {sr > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>Supplier gives us ({sr} rate)</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", color: '#10b981' }}>+{fmt(fa * sr)} {form.toCurrency}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                    <span>Our Profit</span>
                    <span style={{ color: profitInTo >= 0 ? '#10b981' : '#ef4444', fontFamily: "'DM Mono',monospace" }}>
                      {profitInTo >= 0 ? '+' : ''}{fmt(profitInTo)} {form.toCurrency}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn loading={mut.isPending} onClick={() => mut.mutate()} disabled={!form.customerId || !form.fromAmount || !form.clientRate}>
          Create Order
        </Btn>
      </div>
    </Modal>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────

function OrderCard({ order, onAdvance }: { order: RemittanceOrder; onAdvance: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const canAdvance = order.status !== 'completed' && order.status !== 'cancelled';
  const currentStageIdx = STAGES.findIndex(s => s.status === order.status);
  const currentStage = STAGES[currentStageIdx];

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--text3)' }}>#{order.reference}</span>
            <StatusBadge status={order.status} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{order.customerName}</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            <span style={{ fontFamily: "'DM Mono',monospace", color: CURRENCY_COLORS[order.fromCurrency] || 'var(--text)' }}>{fmt(order.fromAmount)} {order.fromCurrency}</span>
            <span style={{ margin: '0 6px', color: 'var(--text3)' }}>→</span>
            <span style={{ fontFamily: "'DM Mono',monospace", color: CURRENCY_COLORS[order.toCurrency] || 'var(--text)' }}>{fmt(order.toAmount)} {order.toCurrency}</span>
            <span style={{ marginLeft: 10, fontSize: 12 }}>@ {parseFloat(order.clientRate).toFixed(4)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {order.profit && parseFloat(order.profit) !== 0 && (
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: parseFloat(order.profit) >= 0 ? '#10b981' : '#ef4444' }}>
              {parseFloat(order.profit) >= 0 ? '+' : ''}{fmt(order.profit)} {order.fromCurrency}
            </span>
          )}
          {canAdvance && (
            <Btn size="sm" onClick={onAdvance}>
              Advance →
            </Btn>
          )}
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: 4 }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      <StageProgress status={order.status} />

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>SUPPLIER</div>
            <div>{order.supplierName || '—'}</div>
            {order.supplierRate && <div style={{ color: 'var(--text3)', marginTop: 2 }}>Rate: {parseFloat(order.supplierRate).toFixed(4)}</div>}
          </div>
          <div>
            <div style={{ color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>BB DETAILS</div>
            <div>{order.bbName || '—'}</div>
            {order.bbDepositRef && <div style={{ color: 'var(--text3)', marginTop: 2 }}>Ref: {order.bbDepositRef}</div>}
            {order.inCompanyAccountName && <div style={{ color: 'var(--text3)', marginTop: 2 }}>→ {order.inCompanyAccountName}</div>}
          </div>
          <div>
            <div style={{ color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>PAYOUT</div>
            <div>{order.payoutMethod === 'bank_transfer' ? '🏦 Bank Transfer' : order.payoutMethod === 'usdt_wallet' ? '₿ USDT' : '💵 Paper'}</div>
            {order.payoutDetail && <div style={{ color: 'var(--text3)', marginTop: 2, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{order.payoutDetail}</div>}
          </div>
          {order.note && (
            <div style={{ gridColumn: '1 / -1', color: 'var(--text3)', fontStyle: 'italic' }}>
              Note: {order.note}
            </div>
          )}
          <div style={{ gridColumn: '1 / -1', color: 'var(--text3)' }}>
            Created: {new Date(order.createdAt).toLocaleString('en-AU')}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function OrdersPage() {
  const [showNew, setShowNew] = useState(false);
  const [advancingOrder, setAdvancingOrder] = useState<RemittanceOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  const { data: orders = [], isLoading } = useQuery<RemittanceOrder[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
    refetchInterval: 30000,
  });

  const filtered = (orders as RemittanceOrder[]).filter(o => {
    if (filterStatus === 'active') return o.status !== 'completed' && o.status !== 'cancelled';
    if (filterStatus === 'completed') return o.status === 'completed';
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  const activeCounts = {
    active: (orders as RemittanceOrder[]).filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
    completed: (orders as RemittanceOrder[]).filter(o => o.status === 'completed').length,
  };

  return (
    <div>
      <PageHeader
        title="Remittance Orders"
        subtitle="Track each order through the full money flow"
        action={<Btn onClick={() => setShowNew(true)}>+ New Order</Btn>}
      />

      {/* Flow diagram */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Money Flow</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { icon: '👤', label: 'Client', sub: 'gives paper' },
            { icon: '→', label: '', sub: '' },
            { icon: '💵', label: 'You', sub: 'receive paper' },
            { icon: '→', label: '', sub: '' },
            { icon: '🏧', label: 'BB', sub: 'collects & deposits' },
            { icon: '→', label: '', sub: '' },
            { icon: '🏦', label: 'Our Bank', sub: 'receives AUD' },
            { icon: '→', label: '', sub: '' },
            { icon: '🏢', label: 'Supplier', sub: 'converts funds' },
            { icon: '→', label: '', sub: '' },
            { icon: '👤', label: 'Client', sub: 'bank/USDT/RMB' },
          ].map((item, i) => (
            item.icon === '→' ? (
              <span key={i} style={{ color: 'var(--text3)', fontSize: 16, margin: '0 2px' }}>→</span>
            ) : (
              <div key={i} style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: 22 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{item.sub}</div>
              </div>
            )
          ))}
        </div>
      </Card>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { k: 'active', label: `Active (${activeCounts.active})` },
          { k: 'completed', label: `Completed (${activeCounts.completed})` },
          { k: 'all', label: 'All' },
          ...STAGES.map(s => ({ k: s.status, label: `${s.icon} ${s.label}` })),
        ].map(f => (
          <button key={f.k} onClick={() => setFilterStatus(f.k)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid',
            fontSize: 12, cursor: 'pointer', fontWeight: filterStatus === f.k ? 700 : 400,
            borderColor: filterStatus === f.k ? 'var(--accent)' : 'var(--border)',
            background: filterStatus === f.k ? 'rgba(59,130,246,0.12)' : 'transparent',
            color: filterStatus === f.k ? 'var(--accent)' : 'var(--text3)',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {isLoading ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No orders</div>
            <Btn onClick={() => setShowNew(true)} style={{ marginTop: 8 }}>Create First Order</Btn>
          </div>
        </Card>
      ) : (
        filtered.map(o => (
          <OrderCard key={o.id} order={o} onAdvance={() => setAdvancingOrder(o)} />
        ))
      )}

      {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
      {advancingOrder && <AdvanceStageModal order={advancingOrder} onClose={() => setAdvancingOrder(null)} />}
    </div>
  );
}

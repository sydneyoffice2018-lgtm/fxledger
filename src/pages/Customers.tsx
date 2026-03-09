import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate, CURRENCY_COLORS, CURRENCIES } from '../lib/api';
import { Customer, Wallet, Transaction, ExchangeOrder } from '../lib/types';
import { Card, Btn, Input, Select, Textarea, Modal, Table, Tr, Td, TxBadge, CurrencyPill, PageHeader, Empty, Spinner, toast } from '../components/ui';

const STATUS_COLORS: Record<string, string> = {
  cash_received:      '#f59e0b',
  bb_deposited:       '#4080ff',
  sent_to_supplier:   '#8b5cf6',
  supplier_converting:'#06b6d4',
  completed:          '#22c55e',
  cancelled:          '#6b7280',
};
const STATUS_LABELS: Record<string, string> = {
  cash_received:      'Paper Received',
  bb_deposited:       'Collector Deposited',
  sent_to_supplier:   'Sent to Supplier',
  supplier_converting:'Converting',
  completed:          'Completed',
  cancelled:          'Cancelled',
};

// ── Add/Edit Customer Modal ────────────────────────────────────────────────
function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!customer;
  const [f, setF] = useState({
    name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '',
    wechat: customer?.wechat || '', idType: customer?.idType || 'passport',
    idNumber: customer?.idNumber || '', idExpiry: customer?.idExpiry || '', dateOfBirth: customer?.dateOfBirth || '',
    bankName: customer?.bankName || '', bankAccount: customer?.bankAccount || '', bankBsb: customer?.bankBsb || '',
    notes: customer?.notes || '',
  });

  const mut = useMutation({
    mutationFn: () => isEdit ? api.put(`/customers/${customer!.id}`, f) : api.post('/customers', f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast(isEdit ? 'Customer updated' : 'Customer added'); onClose(); },
    onError: () => toast('Failed to save customer', 'error'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal title={isEdit ? 'Edit Customer' : 'Add Customer'} onClose={onClose} width={600}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Input label="Full Name *" value={f.name} onChange={set('name')} style={{ gridColumn: '1/-1' }} />
        <Input label="Phone" value={f.phone} onChange={set('phone')} />
        <Input label="Email" value={f.email} onChange={set('email')} />
        <Input label="WeChat ID" value={f.wechat} onChange={set('wechat')} />
        <Input label="Date of Birth" value={f.dateOfBirth} onChange={set('dateOfBirth')} placeholder="DD/MM/YYYY" />
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0', fontWeight: 600 }}>KYC Documents</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Select label="ID Type" value={f.idType} onChange={set('idType')}>
          <option value="passport">Passport</option>
          <option value="drivers_license">Driver's License</option>
          <option value="national_id">National ID</option>
        </Select>
        <Input label="ID Number" value={f.idNumber} onChange={set('idNumber')} />
        <Input label="ID Expiry" value={f.idExpiry} onChange={set('idExpiry')} placeholder="MM/YYYY" />
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0', fontWeight: 600 }}>Bank Details (Settlement)</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Input label="Bank Name" value={f.bankName} onChange={set('bankName')} />
        <Input label="Account Number" value={f.bankAccount} onChange={set('bankAccount')} />
        <Input label="BSB" value={f.bankBsb} onChange={set('bankBsb')} />
      </div>
      <Textarea label="Notes" value={f.notes} onChange={set('notes')} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => f.name && mut.mutate()} loading={mut.isPending}>Save Customer</Btn>
      </div>
    </Modal>
  );
}

// ── Deposit/Withdraw Modal ─────────────────────────────────────────────────
function DepositModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const [currency, setCurrency] = useState('AUD');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isWithdraw, setIsWithdraw] = useState(false);

  const mut = useMutation({
    mutationFn: () => api.post(`/customers/${customer.id}/${isWithdraw ? 'withdraw' : 'deposit'}`, { currency, amount: parseFloat(amount), note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-wallets', customer.id] });
      qc.invalidateQueries({ queryKey: ['customer-txs', customer.id] });
      qc.invalidateQueries({ queryKey: ['dash-stats'] });
      toast(`${isWithdraw ? 'Withdrawal' : 'Deposit'} successful`);
      onClose();
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Transaction failed', 'error'),
  });

  return (
    <Modal title={`${isWithdraw ? 'Withdraw from' : 'Deposit to'} ${customer.name}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Btn variant={!isWithdraw ? 'primary' : 'secondary'} onClick={() => setIsWithdraw(false)}>↙ Deposit</Btn>
        <Btn variant={isWithdraw ? 'danger' : 'secondary'} onClick={() => setIsWithdraw(true)}>↗ Withdraw</Btn>
      </div>
      <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)}>
        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
      </Select>
      <Input label="Amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
      <Input label="Note" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Cash deposit, bank transfer…" />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant={isWithdraw ? 'danger' : 'primary'} onClick={() => amount && mut.mutate()} loading={mut.isPending}>
          Confirm {isWithdraw ? 'Withdrawal' : 'Deposit'}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Order Row (expandable) ─────────────────────────────────────────────────
function OrderRow({ order }: { order: any }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[order.status] || 'var(--text3)';
  return (
    <>
      <Tr onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <Td muted>{fmtDate(order.createdAt)}</Td>
        <Td><span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#f59e0b', fontWeight: 600 }}>{fmt(order.fromAmount)} {order.fromCurrency}</span></Td>
        <Td muted>{order.toCurrency}</Td>
        <Td>{order.supplierName || <span style={{ color: 'var(--text4)' }}>—</span>}</Td>
        <Td>
          <span style={{ background: color + '18', color, border: `1px solid ${color}30`, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </Td>
        <Td><span style={{ color: 'var(--text4)', fontSize: 13 }}>{open ? '▲' : '▼'}</span></Td>
      </Tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: '0 0 0 0', background: 'var(--surface2)' }}>
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, borderBottom: '1px solid var(--border)' }}>
              <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Reference</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{order.reference}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Amount Out</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{order.toAmount ? `${fmt(order.toAmount)} ${order.toCurrency}` : '—'}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Collector</div><div style={{ fontSize: 12 }}>{order.bbName || '—'}</div></div>
              {order.completedAt && <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Completed</div><div style={{ fontSize: 12 }}>{fmtDate(order.completedAt)}</div></div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Transaction Row (expandable) ────────────────────────────────────────────
function TxRow({ tx }: { tx: Transaction }) {
  const [open, setOpen] = useState(false);
  const positive = parseFloat(tx.amount) >= 0;
  return (
    <>
      <Tr onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <Td muted>{fmtDate(tx.createdAt)}</Td>
        <Td><TxBadge type={tx.type} /></Td>
        <Td><CurrencyPill currency={tx.currency} /></Td>
        <Td mono><span style={{ color: positive ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{positive ? '+' : ''}{fmt(tx.amount)}</span></Td>
        <Td mono muted>{fmt(tx.balanceAfter)}</Td>
        <Td muted style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note || '—'}</Td>
        <Td><span style={{ color: 'var(--text4)', fontSize: 13 }}>{open ? '▲' : '▼'}</span></Td>
      </Tr>
      {open && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--surface2)' }}>
            <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, borderBottom: '1px solid var(--border)' }}>
              <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Full Note</div><div style={{ fontSize: 12 }}>{tx.note || '—'}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Balance After</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{fmt(tx.balanceAfter)} {tx.currency}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Transaction ID</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text4)' }}>#{tx.id}</div></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Customer Detail ────────────────────────────────────────────────────────
function CustomerDetail({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'deposit' | 'edit' | null>(null);
  const [tab, setTab] = useState<'orders' | 'transactions' | 'exchanges'>('orders');

  const { data: wallets = [] } = useQuery<Wallet[]>({
    queryKey: ['customer-wallets', customer.id],
    queryFn: () => api.get(`/customers/${customer.id}/wallets`).then(r => r.data),
  });
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['customer-orders', customer.id],
    queryFn: () => api.get(`/customers/${customer.id}/orders`).then(r => r.data),
  });
  const { data: txs = [], isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['customer-txs', customer.id],
    queryFn: () => api.get(`/customers/${customer.id}/transactions?days=14`).then(r => r.data),
  });
  const { data: exchanges = [] } = useQuery<ExchangeOrder[]>({
    queryKey: ['customer-exchanges', customer.id],
    queryFn: () => api.get(`/customers/${customer.id}/exchanges`).then(r => r.data),
  });

  const idTypeLabel: Record<string, string> = { passport: 'Passport', drivers_license: "Driver's Licence", national_id: 'National ID' };

  // Stats
  const activeOrders = (orders as any[]).filter(o => !['completed','cancelled'].includes(o.status));
  const completedOrders = (orders as any[]).filter(o => o.status === 'completed');
  const totalVolume = (orders as any[]).filter(o => o.status === 'completed').reduce((s, o) => s + parseFloat(o.fromAmount || 0), 0);

  const TABS = [
    { key: 'orders',       label: `Orders (${orders.length})` },
    { key: 'transactions', label: `Transactions · 14 days (${txs.length})` },
    { key: 'exchanges',    label: `FX History (${exchanges.length})` },
  ] as const;

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Customers
      </button>

      {/* ── Profile card ── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{customer.name}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text2)', fontSize: 13 }}>
              {customer.phone && <span>📞 {customer.phone}</span>}
              {customer.email && <span>✉ {customer.email}</span>}
              {customer.wechat && <span>💬 {customer.wechat}</span>}
            </div>
            {customer.idNumber && (
              <div style={{ marginTop: 5, color: 'var(--text3)', fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                🪪 {idTypeLabel[customer.idType || 'passport']}: {customer.idNumber}
                {customer.idExpiry && ` · Exp: ${customer.idExpiry}`}
                {customer.dateOfBirth && ` · DOB: ${customer.dateOfBirth}`}
              </div>
            )}
            {customer.bankAccount && (
              <div style={{ marginTop: 3, color: 'var(--text3)', fontSize: 12 }}>
                🏦 {customer.bankName} · BSB {customer.bankBsb} · {customer.bankAccount}
              </div>
            )}
            {customer.notes && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text4)', fontStyle: 'italic' }}>{customer.notes}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" onClick={() => setModal('deposit')}>↙ Deposit / Withdraw</Btn>
            <Btn variant="secondary" size="sm" onClick={() => setModal('edit')}>✎ Edit</Btn>
          </div>
        </div>
      </Card>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Active Orders', value: activeOrders.length, color: '#f59e0b' },
          { label: 'Completed Orders', value: completedOrders.length, color: '#22c55e' },
          { label: 'Total Volume (AUD)', value: `A$${fmt(totalVolume)}`, color: 'var(--text)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Wallet balances ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Current Balances</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {wallets.length === 0
            ? <span style={{ color: 'var(--text4)', fontSize: 13 }}>No balances yet</span>
            : wallets.map(w => (
              <div key={w.id} style={{
                background: 'var(--surface)', border: `1px solid ${CURRENCY_COLORS[w.currency] || 'var(--border)'}40`,
                borderRadius: 10, padding: '12px 18px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: CURRENCY_COLORS[w.currency] || 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{w.currency}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 800, color: CURRENCY_COLORS[w.currency] || 'var(--text)' }}>{fmt(w.balance)}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: tab === t.key ? 'var(--accent)' : 'transparent',
            color: tab === t.key ? '#0c0e12' : 'var(--text3)',
            whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {/* Orders tab */}
        {tab === 'orders' && (
          orders.length === 0 ? <Empty msg="No orders yet" /> :
          <Table headers={['Date', 'Amount', 'To', 'Supplier', 'Status', '']}>
            {(orders as any[]).map(o => <OrderRow key={o.id} order={o} />)}
          </Table>
        )}

        {/* Transactions tab — last 14 days */}
        {tab === 'transactions' && (
          txLoading ? <Spinner /> :
          txs.length === 0 ? <Empty msg="No transactions in the last 14 days" /> :
          <Table headers={['Date', 'Type', 'Currency', 'Amount', 'Balance After', 'Note', '']}>
            {txs.map(tx => <TxRow key={tx.id} tx={tx} />)}
          </Table>
        )}

        {/* FX exchanges tab */}
        {tab === 'exchanges' && (
          exchanges.length === 0 ? <Empty msg="No exchange history" /> :
          <Table headers={['Date', 'From', 'To', 'Market Rate', 'Our Rate', 'Profit', 'Supplier']}>
            {exchanges.map(o => (
              <Tr key={o.id}>
                <Td muted>{fmtDate(o.createdAt)}</Td>
                <Td><span style={{ color: CURRENCY_COLORS[o.fromCurrency] }}>{o.fromCurrency}</span> <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(o.fromAmount)}</span></Td>
                <Td><span style={{ color: CURRENCY_COLORS[o.toCurrency] }}>{o.toCurrency}</span> <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(o.toAmount)}</span></Td>
                <Td mono muted>{parseFloat(o.marketRate).toFixed(4)}</Td>
                <Td mono>{parseFloat(o.ourRate).toFixed(4)}</Td>
                <Td mono><span style={{ color: parseFloat(o.profit) > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(o.profit)}</span></Td>
                <Td muted>{(o as any).supplierName || '—'}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {modal === 'deposit' && <DepositModal customer={customer} onClose={() => setModal(null)} />}
      {modal === 'edit' && <CustomerModal customer={customer} onClose={() => setModal(null)} />}
    </div>
  );
}

// ── Customer List ──────────────────────────────────────────────────────────
export function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  });

  if (selected) return <CustomerDetail customer={selected} onBack={() => setSelected(null)} />;

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.idNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} total customers`} action={<Btn onClick={() => setShowAdd(true)}>+ Add Customer</Btn>} />

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, ID…"
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />

      {isLoading ? <Spinner /> : (
        <Card>
          {filtered.length === 0 ? <Empty msg="No customers found" /> : (
            <Table headers={['Name', 'Phone', 'Email', 'WeChat', 'ID', 'Bank', '']}>
              {filtered.map(c => (
                <Tr key={c.id} onClick={() => setSelected(c)}>
                  <Td><span style={{ fontWeight: 600 }}>{c.name}</span></Td>
                  <Td muted>{c.phone || '—'}</Td>
                  <Td muted>{c.email || '—'}</Td>
                  <Td muted>{c.wechat || '—'}</Td>
                  <Td muted style={{ fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{c.idNumber || '—'}</Td>
                  <Td muted>{c.bankAccount ? `${c.bankBsb} / ${c.bankAccount}` : '—'}</Td>
                  <Td><span style={{ color: 'var(--accent)', fontSize: 12 }}>View →</span></Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate, CURRENCY_COLORS, CURRENCIES } from '../lib/api';
import { Customer, Wallet, Transaction, ExchangeOrder } from '../lib/types';
import { Card, Btn, Input, Select, Textarea, Modal, Table, Tr, Td, TxBadge, CurrencyPill, PageHeader, Empty, Spinner, toast } from '../components/ui';

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-wallets', customer.id] }); qc.invalidateQueries({ queryKey: ['customer-txs', customer.id] }); qc.invalidateQueries({ queryKey: ['dash-stats'] }); toast(`${isWithdraw ? 'Withdrawal' : 'Deposit'} successful`); onClose(); },
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

// ── Customer Detail ────────────────────────────────────────────────────────
function CustomerDetail({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'deposit' | 'edit' | null>(null);
  const [txTab, setTxTab] = useState<'transactions' | 'exchanges'>('transactions');

  const { data: wallets = [] } = useQuery<Wallet[]>({ queryKey: ['customer-wallets', customer.id], queryFn: () => api.get(`/customers/${customer.id}/wallets`).then(r => r.data) });
  const { data: txs = [], isLoading: txLoading } = useQuery<Transaction[]>({ queryKey: ['customer-txs', customer.id], queryFn: () => api.get(`/customers/${customer.id}/transactions`).then(r => r.data) });
  const { data: exchanges = [] } = useQuery<ExchangeOrder[]>({ queryKey: ['customer-exchanges', customer.id], queryFn: () => api.get(`/customers/${customer.id}/exchanges`).then(r => r.data) });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/customers/${customer.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast('Customer deleted'); onBack(); },
    onError: () => toast('Delete failed', 'error'),
  });

  const idTypeLabel = { passport: 'Passport', drivers_license: "Driver's Licence", national_id: 'National ID' };

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Customers
      </button>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>{customer.name}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text2)', fontSize: 13 }}>
              {customer.phone && <span>📞 {customer.phone}</span>}
              {customer.email && <span>✉ {customer.email}</span>}
              {customer.wechat && <span>💬 {customer.wechat}</span>}
            </div>
            {customer.idNumber && (
              <div style={{ marginTop: 6, color: 'var(--text3)', fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                {idTypeLabel[customer.idType || 'passport']}: {customer.idNumber}
                {customer.idExpiry && ` · Exp: ${customer.idExpiry}`}
                {customer.dateOfBirth && ` · DOB: ${customer.dateOfBirth}`}
              </div>
            )}
            {customer.bankAccount && (
              <div style={{ marginTop: 4, color: 'var(--text3)', fontSize: 12 }}>
                🏦 {customer.bankName} · {customer.bankBsb} / {customer.bankAccount}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" onClick={() => setModal('deposit')}>↙ Deposit/Withdraw</Btn>
            <Btn variant="secondary" size="sm" onClick={() => setModal('edit')}>✎ Edit</Btn>
            <Btn variant="danger" size="sm" onClick={() => confirm('Delete this customer?') && deleteMut.mutate()}>🗑</Btn>
          </div>
        </div>

        {/* Wallets */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {wallets.length === 0 && <span style={{ color: 'var(--text3)', fontSize: 13 }}>No balances yet</span>}
          {wallets.map(w => (
            <div key={w.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <CurrencyPill currency={w.currency} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700 }}>{fmt(w.balance)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['transactions', 'exchanges'] as const).map(t => (
          <button key={t} onClick={() => setTxTab(t)} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: txTab === t ? 'var(--accent)' : 'transparent', color: txTab === t ? '#fff' : 'var(--text3)', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      <Card>
        {txTab === 'transactions' && (
          txLoading ? <Spinner /> : txs.length === 0 ? <Empty msg="No transactions yet" /> :
          <Table headers={['Date', 'Type', 'Currency', 'Amount', 'Balance After', 'Note']}>
            {txs.map(tx => (
              <Tr key={tx.id}>
                <Td muted>{fmtDate(tx.createdAt)}</Td>
                <Td><TxBadge type={tx.type} /></Td>
                <Td><CurrencyPill currency={tx.currency} /></Td>
                <Td mono><span style={{ color: parseFloat(tx.amount) >= 0 ? 'var(--green)' : 'var(--red)' }}>{parseFloat(tx.amount) >= 0 ? '+' : ''}{fmt(tx.amount)}</span></Td>
                <Td mono muted>{fmt(tx.balanceAfter)}</Td>
                <Td muted>{tx.note || '—'}</Td>
              </Tr>
            ))}
          </Table>
        )}
        {txTab === 'exchanges' && (
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

// ── Customer List Page ─────────────────────────────────────────────────────
export function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery<Customer[]>({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });

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

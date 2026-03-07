import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate, CURRENCIES, CURRENCY_COLORS } from '../lib/api';
import { Supplier, SupplierPayment } from '../lib/types';
import { Card, Btn, Input, Select, Textarea, Modal, Table, Tr, Td, TxBadge, CurrencyPill, PageHeader, Empty, Spinner, toast } from '../components/ui';

// ── Add/Edit Supplier Modal ────────────────────────────────────────────────
function SupplierModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!supplier;
  const [f, setF] = useState({
    name: supplier?.name || '', contact: supplier?.contact || '',
    phone: supplier?.phone || '', email: supplier?.email || '', wechat: supplier?.wechat || '',
    bankName: supplier?.bankName || '', bankAccount: supplier?.bankAccount || '', bankBsb: supplier?.bankBsb || '',
    supportedCurrencies: supplier?.supportedCurrencies ? JSON.parse(supplier.supportedCurrencies) : [] as string[],
    notes: supplier?.notes || '',
  });

  const toggleCurrency = (c: string) => {
    setF(p => ({ ...p, supportedCurrencies: p.supportedCurrencies.includes(c) ? p.supportedCurrencies.filter((x: string) => x !== c) : [...p.supportedCurrencies, c] }));
  };

  const mut = useMutation({
    mutationFn: () => isEdit ? api.put(`/suppliers/${supplier!.id}`, f) : api.post('/suppliers', f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast(isEdit ? 'Supplier updated' : 'Supplier added'); onClose(); },
    onError: () => toast('Failed to save supplier', 'error'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal title={isEdit ? 'Edit Supplier' : 'Add Supplier'} onClose={onClose} width={580}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Input label="Company Name *" value={f.name} onChange={set('name')} style={{ gridColumn: '1/-1' }} />
        <Input label="Contact Person" value={f.contact} onChange={set('contact')} />
        <Input label="Phone" value={f.phone} onChange={set('phone')} />
        <Input label="Email" value={f.email} onChange={set('email')} />
        <Input label="WeChat" value={f.wechat} onChange={set('wechat')} />
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0', fontWeight: 600 }}>Bank Details</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Input label="Bank Name" value={f.bankName} onChange={set('bankName')} />
        <Input label="Account Number" value={f.bankAccount} onChange={set('bankAccount')} />
        <Input label="BSB" value={f.bankBsb} onChange={set('bankBsb')} />
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0', fontWeight: 600 }}>Supported Currencies</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {CURRENCIES.map(c => (
          <button key={c} onClick={() => toggleCurrency(c)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${f.supportedCurrencies.includes(c) ? CURRENCY_COLORS[c] : 'var(--border2)'}`, background: f.supportedCurrencies.includes(c) ? `${CURRENCY_COLORS[c]}22` : 'transparent', color: f.supportedCurrencies.includes(c) ? CURRENCY_COLORS[c] : 'var(--text3)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {c}
          </button>
        ))}
      </div>
      <Textarea label="Notes" value={f.notes} onChange={set('notes')} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => f.name && mut.mutate()} loading={mut.isPending}>Save Supplier</Btn>
      </div>
    </Modal>
  );
}

// ── Supplier Detail ────────────────────────────────────────────────────────
function SupplierDetail({ supplier, onBack }: { supplier: Supplier; onBack: () => void }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const { data: payments = [], isLoading } = useQuery<SupplierPayment[]>({
    queryKey: ['supplier-payments', supplier.id],
    queryFn: () => api.get(`/suppliers/${supplier.id}/payments`).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/suppliers/payments/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-payments', supplier.id] }); toast('Status updated'); },
    onError: () => toast('Update failed', 'error'),
  });

  const currencies = (() => { try { return JSON.parse(supplier.supportedCurrencies) as string[]; } catch { return []; } })();

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Back to Suppliers</button>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>{supplier.name}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text2)', fontSize: 13 }}>
              {supplier.contact && <span>👤 {supplier.contact}</span>}
              {supplier.phone && <span>📞 {supplier.phone}</span>}
              {supplier.email && <span>✉ {supplier.email}</span>}
              {supplier.wechat && <span>💬 {supplier.wechat}</span>}
            </div>
            {supplier.bankAccount && (
              <div style={{ marginTop: 6, color: 'var(--text3)', fontSize: 12 }}>
                🏦 {supplier.bankName} · {supplier.bankBsb} / {supplier.bankAccount}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {currencies.map((c: string) => <CurrencyPill key={c} currency={c} />)}
            </div>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => setModal(true)}>✎ Edit</Btn>
        </div>
      </Card>

      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Payment History</h3>
      <Card>
        {isLoading ? <Spinner /> : payments.length === 0 ? <Empty msg="No payments yet" /> : (
          <Table headers={['Date', 'Customer', 'Order', 'Currency', 'Amount', 'Status', 'Settlement', 'Actions']}>
            {payments.map(p => (
              <Tr key={p.id}>
                <Td muted>{fmtDate(p.createdAt)}</Td>
                <Td><span style={{ fontWeight: 600 }}>{p.customerName || '—'}</span></Td>
                <Td muted>
                  {p.orderFromCurrency && <span style={{ fontSize: 12 }}>
                    <CurrencyPill currency={p.orderFromCurrency} /> {fmt(p.orderFromAmount || 0)} → <CurrencyPill currency={p.orderToCurrency || ''} /> {fmt(p.orderToAmount || 0)}
                  </span>}
                </Td>
                <Td><CurrencyPill currency={p.currency} /></Td>
                <Td mono>{fmt(p.amount)}</Td>
                <Td><TxBadge type={p.status} /></Td>
                <Td>
                  {p.customerBankAccount ? (
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
                      {p.customerBankName} {p.customerBankBsb}/{p.customerBankAccount}
                    </span>
                  ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                </Td>
                <Td>
                  {p.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn size="sm" variant="success" onClick={() => updateStatus.mutate({ id: p.id, status: 'completed' })}>✓ Complete</Btn>
                      <Btn size="sm" variant="danger" onClick={() => updateStatus.mutate({ id: p.id, status: 'cancelled' })}>✗</Btn>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {modal && <SupplierModal supplier={supplier} onClose={() => setModal(false)} />}
    </div>
  );
}

// ── Suppliers List ─────────────────────────────────────────────────────────
export function SuppliersPage() {
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast('Supplier deleted'); },
    onError: () => toast('Delete failed', 'error'),
  });

  if (selected) return <SupplierDetail supplier={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Currency providers and settlement partners" action={<Btn onClick={() => setShowAdd(true)}>+ Add Supplier</Btn>} />

      {isLoading ? <Spinner /> : (
        <Card>
          {suppliers.length === 0 ? <Empty msg="No suppliers yet" /> : (
            <Table headers={['Name', 'Contact', 'Phone', 'Bank', 'Currencies', 'Actions']}>
              {suppliers.map(s => {
                const currencies = (() => { try { return JSON.parse(s.supportedCurrencies) as string[]; } catch { return []; } })();
                return (
                  <Tr key={s.id} onClick={() => setSelected(s)}>
                    <Td><span style={{ fontWeight: 600 }}>{s.name}</span></Td>
                    <Td muted>{s.contact || '—'}</Td>
                    <Td muted>{s.phone || '—'}</Td>
                    <Td muted style={{ fontSize: 12 }}>{s.bankAccount ? `${s.bankBsb}/${s.bankAccount}` : '—'}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {currencies.map((c: string) => <CurrencyPill key={c} currency={c} />)}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <Btn size="sm" variant="secondary" onClick={() => setSelected(s)}>View</Btn>
                        <Btn size="sm" variant="danger" onClick={() => confirm('Delete?') && deleteMut.mutate(s.id)}>🗑</Btn>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          )}
        </Card>
      )}

      {showAdd && <SupplierModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

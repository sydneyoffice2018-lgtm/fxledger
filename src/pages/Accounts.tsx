import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCIES, CURRENCY_COLORS } from '../lib/api';
import { Card, Btn, Input, Select, PageHeader, Modal, toast } from '../components/ui';

interface CompanyAccount {
  id: number;
  name: string;
  currency: string;
  bankName?: string;
  accountNumber?: string;
  bsb?: string;
  balance: number | string;
  notes?: string;
  active: boolean;
}

export function AccountsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CompanyAccount | null>(null);
  const [form, setForm] = useState({ name: '', currency: 'AUD', bankName: '', accountNumber: '', bsb: '', notes: '' });

  const { data: accounts = [], isLoading } = useQuery<CompanyAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  });

  const saveMut = useMutation({
    mutationFn: () => editing
      ? api.put(`/accounts/${editing.id}`, form)
      : api.post('/accounts', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', currency: 'AUD', bankName: '', accountNumber: '', bsb: '', notes: '' });
      toast(editing ? 'Account updated' : 'Account created');
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed', 'error'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => api.delete(`/accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast('Account deactivated'); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', currency: 'AUD', bankName: '', accountNumber: '', bsb: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (acc: CompanyAccount) => {
    setEditing(acc);
    setForm({ name: acc.name, currency: acc.currency, bankName: acc.bankName || '', accountNumber: acc.accountNumber || '', bsb: acc.bsb || '', notes: acc.notes || '' });
    setShowModal(true);
  };

  const grouped = CURRENCIES.reduce((acc, cur) => {
    acc[cur] = accounts.filter(a => a.currency === cur && a.active);
    return acc;
  }, {} as Record<string, CompanyAccount[]>);

  const totalByCurrency = accounts
    .filter(a => a.active)
    .reduce((acc, a) => {
      acc[a.currency] = (acc[a.currency] || 0) + parseFloat(a.balance as string || '0');
      return acc;
    }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader title="Company Accounts" subtitle="Manage your business bank accounts and cash holdings" />

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.entries(totalByCurrency).filter(([, v]) => v !== 0).map(([cur, total]) => (
          <div key={cur} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 20px', minWidth: 140,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{cur} TOTAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: CURRENCY_COLORS[cur] || 'var(--text)' }}>
              {fmt(total)}
            </div>
          </div>
        ))}
        <Btn onClick={openCreate} style={{ alignSelf: 'center', marginLeft: 'auto' }}>+ Add Account</Btn>
      </div>

      {/* Accounts by currency */}
      {isLoading ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : accounts.filter(a => a.active).length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No accounts yet</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Add your company bank accounts and cash holdings to track where money is stored.</div>
            <Btn onClick={openCreate}>+ Add First Account</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {CURRENCIES.map(cur => grouped[cur]?.length > 0 && (
            <div key={cur}>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: CURRENCY_COLORS[cur] || 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {cur} Accounts
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {grouped[cur].map(acc => (
                  <Card key={acc.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{acc.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {acc.bankName && <span>{acc.bankName}</span>}
                          {acc.bsb && <span> · BSB {acc.bsb}</span>}
                          {acc.accountNumber && <span> · {acc.accountNumber}</span>}
                        </div>
                      </div>
                      <button onClick={() => openEdit(acc)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>BALANCE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: CURRENCY_COLORS[cur] || 'var(--text)' }}>
                          {fmt(acc.balance)}
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('Deactivate this account?')) deactivateMut.mutate(acc.id); }}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text3)', cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>
                    {acc.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{acc.notes}</div>}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Account' : 'Add Company Account'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Account Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. ANZ AUD Main, WeChat Pay CNY, Cash Drawer AUD" />
          <Select label="Currency *" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Bank Name" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
            placeholder="e.g. ANZ, Commonwealth, WeChat" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="BSB" value={form.bsb} onChange={e => setForm(f => ({ ...f, bsb: e.target.value }))} placeholder="e.g. 012-345" />
            <Input label="Account Number" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="e.g. 123456789" />
          </div>
          <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes…" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn loading={saveMut.isPending} onClick={() => saveMut.mutate()} disabled={!form.name || !form.currency}>
              {editing ? 'Save Changes' : 'Create Account'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

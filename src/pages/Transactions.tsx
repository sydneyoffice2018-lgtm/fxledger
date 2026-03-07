import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate } from '../lib/api';
import { Transaction, User } from '../lib/types';
import { Card, Btn, Input, Select, Modal, Table, Tr, Td, TxBadge, CurrencyPill, PageHeader, Empty, Spinner, toast } from '../components/ui';

// ── Transactions Page ──────────────────────────────────────────────────────
export function TransactionsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => api.get('/transactions?limit=200').then(r => r.data),
    refetchInterval: 15000,
  });

  const TX_TYPES = ['all', 'deposit', 'withdrawal', 'exchange_in', 'exchange_out'];

  const filtered = transactions.filter(tx => {
    const matchType = filter === 'all' || tx.type === filter;
    const matchSearch = !search || (tx.customerName || '').toLowerCase().includes(search.toLowerCase()) || tx.currency.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div>
      <PageHeader title="Transactions" subtitle={`${transactions.length} total records`} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or currency…"
          style={{ flex: '1 1 200px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 13px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TX_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${filter === t ? 'var(--accent)' : 'var(--border2)'}`, background: filter === t ? 'rgba(59,130,246,0.15)' : 'transparent', color: filter === t ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
              {t === 'all' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <Card>
          {filtered.length === 0 ? <Empty msg="No transactions found" /> : (
            <Table headers={['Date', 'Customer', 'Type', 'Currency', 'Amount', 'Balance After', 'Note']}>
              {filtered.map(tx => (
                <Tr key={tx.id}>
                  <Td muted>{fmtDate(tx.createdAt)}</Td>
                  <Td><span style={{ fontWeight: 600 }}>{tx.customerName || '—'}</span></Td>
                  <Td><TxBadge type={tx.type} /></Td>
                  <Td><CurrencyPill currency={tx.currency} /></Td>
                  <Td mono>
                    <span style={{ color: parseFloat(tx.amount) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {parseFloat(tx.amount) >= 0 ? '+' : ''}{fmt(tx.amount)}
                    </span>
                  </Td>
                  <Td mono muted>{fmt(tx.balanceAfter)}</Td>
                  <Td muted>{tx.note || '—'}</Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Users Page (Admin Only) ────────────────────────────────────────────────
function AddUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ username: '', password: '', role: 'operator' as 'admin' | 'operator' });

  const mut = useMutation({
    mutationFn: () => api.post('/auth/users', f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('User created'); onClose(); },
    onError: (e: any) => toast(e?.response?.data?.error || 'Failed to create user', 'error'),
  });

  return (
    <Modal title="Add User" onClose={onClose}>
      <Input label="Username" value={f.username} onChange={e => setF(p => ({ ...p, username: e.target.value }))} />
      <Input label="Password" type="password" value={f.password} onChange={e => setF(p => ({ ...p, password: e.target.value }))} />
      <Select label="Role" value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value as 'admin' | 'operator' }))}>
        <option value="operator">Operator</option>
        <option value="admin">Admin</option>
      </Select>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => f.username && f.password && mut.mutate()} loading={mut.isPending}>Create User</Btn>
      </div>
    </Modal>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/auth/users').then(r => r.data) });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('User deleted'); },
    onError: (e: any) => toast(e?.response?.data?.error || 'Delete failed', 'error'),
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="System user management (Admin only)" action={<Btn onClick={() => setShowAdd(true)}>+ Add User</Btn>} />

      {isLoading ? <Spinner /> : (
        <Card>
          <Table headers={['Username', 'Role', 'Status', 'Created', 'Actions']}>
            {users.map(u => (
              <Tr key={u.id}>
                <Td><span style={{ fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{u.username}</span></Td>
                <Td>
                  <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: u.role === 'admin' ? 'rgba(167,139,250,0.15)' : 'rgba(100,116,139,0.15)', color: u.role === 'admin' ? 'var(--purple)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {u.role}
                  </span>
                </Td>
                <Td>
                  <span style={{ color: u.active ? 'var(--green)' : 'var(--red)', fontSize: 12 }}>
                    {u.active ? '● Active' : '● Inactive'}
                  </span>
                </Td>
                <Td muted>{u.createdAt ? fmtDate(u.createdAt) : '—'}</Td>
                <Td>
                  <Btn size="sm" variant="danger" onClick={() => confirm('Delete this user?') && deleteMut.mutate(u.id)}>Delete</Btn>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

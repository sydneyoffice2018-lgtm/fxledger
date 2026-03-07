import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, fmtDate, CURRENCY_COLORS, CURRENCY_SYMBOLS } from '../lib/api';
import { DashStats, ExchangeRate } from '../lib/types';
import { StatCard, Card, TxBadge, CurrencyPill, Table, Tr, Td, Spinner, Btn, toast } from '../components/ui';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function DashboardPage() {
  const qc = useQueryClient();
  const { data: stats, isLoading } = useQuery<DashStats>({ queryKey: ['dash-stats'], queryFn: () => api.get('/dashboard/stats').then(r => r.data), refetchInterval: 30000 });
  const { data: chart } = useQuery<any[]>({ queryKey: ['dash-chart'], queryFn: () => api.get('/dashboard/chart').then(r => r.data) });
  const { data: rates } = useQuery<ExchangeRate[]>({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });

  const refreshMut = useMutation({
    mutationFn: () => api.post('/rates/refresh'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); toast('Rates refreshed'); },
    onError: () => toast('Failed to refresh rates', 'error'),
  });

  if (isLoading) return <Spinner />;

  const keyRates = ['AUD/CNY', 'AUD/USD', 'AUD/USDT', 'USD/CNY', 'GBP/AUD', 'EUR/AUD'];
  const displayRates = rates?.filter(r => keyRates.includes(`${r.fromCurrency}/${r.toCurrency}`)) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text3)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Btn variant="secondary" onClick={() => refreshMut.mutate()} loading={refreshMut.isPending} size="sm">⟳ Refresh Rates</Btn>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Today's Exchanges" value={stats?.todayExchanges || 0} icon="⇄" color="var(--accent)" />
        <StatCard label="Today's Profit" value={`A$${fmt(stats?.todayProfit || 0)}`} icon="💰" color="var(--green)" />
        <StatCard label="Month Exchanges" value={stats?.monthExchanges || 0} icon="📅" color="var(--purple)" />
        <StatCard label="Month Profit" value={`A$${fmt(stats?.monthProfit || 0)}`} icon="📈" color="var(--gold)" />
        <StatCard label="Total Customers" value={stats?.totalCustomers || 0} icon="👤" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Profit Chart */}
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>30-Day Profit Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart || []}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: '#111520', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }} formatter={(v: any) => [`A$${fmt(v)}`, 'Profit']} />
              <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="url(#profitGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Live Rates */}
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Live Rates</h3>
          {displayRates.map(r => (
            <div key={`${r.fromCurrency}/${r.toCurrency}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: 'var(--text2)' }}>{r.fromCurrency}/{r.toCurrency}</span>
              <span style={{ color: CURRENCY_COLORS[r.toCurrency] || 'var(--text)', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600 }}>{r.rate.toFixed(4)}</span>
            </div>
          ))}
          {displayRates.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>No rates available</p>}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Recent Transactions</h3>
        <Table headers={['Date', 'Customer', 'Type', 'Currency', 'Amount', 'Balance After']}>
          {(stats?.recentTransactions || []).map(tx => (
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
            </Tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

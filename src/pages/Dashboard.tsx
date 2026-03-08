import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { api, fmt, CURRENCY_COLORS } from '../lib/api';
import { Card, Mono, toast } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashStats {
  todayExchanges: number;
  todayProfit: string | number;
  monthExchanges: number;
  monthProfit: string | number;
  totalCustomers: number;
}

const FLOW_STEPS = [
  { icon: '💵', label: 'Paper In',       color: '#e8a020', desc: 'Client gives paper' },
  { icon: '🏧', label: 'Collector Dep.', color: '#4080ff', desc: 'Collector to our bank' },
  { icon: '📤', label: 'Send Supplier',  color: '#a855f7', desc: 'We wire to supplier' },
  { icon: '🔄', label: 'Converting',     color: '#06b6d4', desc: 'Supplier exchanges' },
  { icon: '✅', label: 'Paid Out',       color: '#22c55e', desc: 'Client receives' },
];

export function DashboardPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: stats } = useQuery<DashStats>({ queryKey: ['dash-stats'], queryFn: () => api.get('/dashboard/stats').then(r => r.data) });
  const { data: chart = [] } = useQuery<any[]>({ queryKey: ['dash-chart'], queryFn: () => api.get('/dashboard/chart').then(r => r.data) });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ['accounts'], queryFn: () => api.get('/accounts').then(r => r.data) });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ['orders'], queryFn: () => api.get('/orders').then(r => r.data) });

  const refreshMut = useMutation({
    mutationFn: () => api.post('/rates/refresh'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); toast('Rates refreshed'); },
  });

  const activeOrders = (orders as any[]).filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const todayProfit = parseFloat(stats?.todayProfit as string || '0');
  const monthProfit = parseFloat(stats?.monthProfit as string || '0');

  // Count by stage
  const stageCounts = {
    cash_received: activeOrders.filter(o => o.status === 'cash_received').length,
    bb_deposited: activeOrders.filter(o => o.status === 'bb_deposited').length,
    sent_to_supplier: activeOrders.filter(o => o.status === 'sent_to_supplier').length,
    supplier_converting: activeOrders.filter(o => o.status === 'supplier_converting').length,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text4)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{dateStr}</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
            Overview
          </h1>
        </div>
        <button
          onClick={() => refreshMut.mutate()}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 9, padding: '8px 16px', color: 'var(--text3)',
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <span style={{ animation: refreshMut.isPending ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>⟳</span>
          Refresh Rates
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: "Today's Orders", value: stats?.todayExchanges ?? '—', icon: '⟳', color: 'var(--text)' },
          { label: "Today's Profit", value: `A$${fmt(todayProfit)}`, icon: '◈', color: todayProfit >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Month Orders', value: stats?.monthExchanges ?? '—', icon: '▦', color: 'var(--text)' },
          { label: 'Month Profit', value: `A$${fmt(monthProfit)}`, icon: '◉', color: monthProfit >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: 16, top: 12, fontSize: 20, opacity: 0.08, color: s.color }}>{s.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>

        {/* ── Pipeline ── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Active Pipeline</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{activeOrders.length} orders in progress</div>
            </div>
            <button onClick={() => navigate('/paper')} style={{
              background: 'var(--accent-dim)', border: '1px solid rgba(232,160,32,0.2)',
              borderRadius: 8, padding: '6px 14px', color: 'var(--accent)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}>
              View All →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { key: 'cash_received', label: 'Paper Received', icon: '💵', color: '#e8a020' },
              { key: 'bb_deposited', label: 'Collector Dep.', icon: '🏧', color: '#4080ff' },
              { key: 'sent_to_supplier', label: 'Sent to Supplier', icon: '📤', color: '#a855f7' },
              { key: 'supplier_converting', label: 'Converting', icon: '🔄', color: '#06b6d4' },
            ].map(stage => {
              const count = stageCounts[stage.key as keyof typeof stageCounts];
              return (
                <div key={stage.key} style={{
                  background: 'var(--surface2)', border: `1px solid ${count > 0 ? stage.color + '30' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{stage.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: count > 0 ? stage.color : 'var(--text4)' }}>{count}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4, lineHeight: 1.3 }}>{stage.label}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Live Rates ── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Rates</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--green)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-dot 2s ease infinite' }} />
              Live
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(rates as any[]).slice(0, 7).map((r: any) => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 7,
                background: 'var(--surface2)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>
                  {r.fromCurrency}/{r.toCurrency}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: CURRENCY_COLORS[r.toCurrency] || 'var(--accent)',
                }}>
                  {parseFloat(r.rate).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Balance Overview ── */}
      {(accounts as any[]).filter((a: any) => a.active).length > 0 && (() => {
        const activeAccounts = (accounts as any[]).filter((a: any) => a.active);
        const byCurrency = activeAccounts.reduce((acc: any, a: any) => {
          if (!acc[a.currency]) acc[a.currency] = { total: 0, accounts: [] };
          acc[a.currency].total += parseFloat(a.balance || '0');
          acc[a.currency].accounts.push(a);
          return acc;
        }, {} as Record<string, { total: number; accounts: any[] }>);

        const pendingIn = (orders as any[]).filter((o: any) => ['cash_received', 'bb_deposited'].includes(o.status));
        const pendingInTotal = pendingIn.reduce((s: number, o: any) => s + parseFloat(o.fromAmount || '0'), 0);
        const pendingInCurrency = pendingIn[0]?.fromCurrency || 'AUD';

        return (
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Balance Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {Object.entries(byCurrency).map(([cur, data]: [string, any]) => (
                <div key={cur} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', border: `1px solid ${CURRENCY_COLORS[cur] || 'var(--border)'}22` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: CURRENCY_COLORS[cur] || 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🏦 {cur} BANKS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: CURRENCY_COLORS[cur] || 'var(--text)' }}>{fmt(data.total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{data.accounts.length} account{data.accounts.length !== 1 ? 's' : ''}</div>
                </div>
              ))}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', border: '1px solid #f59e0b22' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>💵 WITH COLLECTOR</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: '#f59e0b' }}>{fmt(pendingInTotal)}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{pendingIn.length} order{pendingIn.length !== 1 ? 's' : ''} in transit ({pendingInCurrency})</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', border: '1px solid #ef444422' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>👥 CLIENTS ({(customers as any[]).length})</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: 'var(--text)' }}>{(customers as any[]).length}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>registered clients</div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ── Profit chart ── */}
      <Card>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>30-Day Profit Trend</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chart as any[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--text4)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text4)', fontSize: 10, fontFamily: "'JetBrains Mono'" }} axisLine={false} tickLine={false} width={52} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
            <Tooltip
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text3)' }}
              formatter={(v: any) => [`A$${fmt(v)}`, 'Profit']}
            />
            <Line type="monotone" dataKey="profit" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

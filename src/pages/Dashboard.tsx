import { useQuery } from '@tanstack/react-query';
import { api, fmt } from '../lib/api';
import { StatCard, Card, PageHeader } from '../components/ui';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashStats {
  todayOrders: number; todayProfit: number;
  monthOrders: number; monthProfit: number;
  totalCustomers: number; activeOrders?: number;
}

export function DashboardPage() {
  const { data: stats } = useQuery<DashStats>({ queryKey: ['dash'], queryFn: () => api.get('/transactions/dashboard').then(r => r.data) });
  const { data: chart = [] } = useQuery<any[]>({ queryKey: ['chart'], queryFn: () => api.get('/transactions/chart').then(r => r.data) });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const monthProfit = stats?.monthProfit ?? 0;

  const KEY_PAIRS = [['AUD','CNY'],['AUD','USD'],['AUD','USDT'],['USD','CNY']];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Dashboard</h1>
        <p style={{ margin: '5px 0 0', color: 'var(--text3)', fontSize: 13 }}>{today}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Today's Orders" value={stats?.todayOrders ?? 0} icon="📋" />
        <StatCard label="Today's Profit" value={`A$${fmt(stats?.todayProfit ?? 0)}`} color={monthProfit >= 0 ? 'var(--green)' : 'var(--red)'} icon="💰" />
        <StatCard label="Month Orders" value={stats?.monthOrders ?? 0} icon="📅" />
        <StatCard label="Month Profit" value={`A$${fmt(monthProfit)}`} color={monthProfit >= 0 ? 'var(--green)' : 'var(--red)'} accent={true} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Profit chart */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 18 }}>30-Day Profit Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a2f55" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#1a2f55" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text4)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text4)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-md)' }}
                labelStyle={{ color: 'var(--text3)', marginBottom: 4 }}
                formatter={(v: any) => [`A$${fmt(v)}`, 'Profit']}
              />
              <Area type="monotone" dataKey="profit" stroke="#1a2f55" strokeWidth={2} fill="url(#profGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Live rates */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Live Rates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {KEY_PAIRS.map(([from, to]) => {
              const r = (rates as any[]).find(x => x.fromCurrency === from && x.toCurrency === to);
              if (!r) return null;
              return (
                <div key={`${from}${to}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', borderRadius: 9,
                  background: 'var(--surface2)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{from} / {to}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                    {parseFloat(r.rate).toFixed(4)}
                  </span>
                </div>
              );
            })}
            {(rates as any[]).filter(r => !KEY_PAIRS.some(([f,t]) => r.fromCurrency===f && r.toCurrency===t)).slice(0,4).map((r: any) => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 12px', borderRadius: 9, background: 'var(--surface2)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{r.fromCurrency} / {r.toCurrency}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                  {parseFloat(r.rate).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatCard label="Total Clients" value={stats?.totalCustomers ?? 0} icon="👤" />
        <Card style={{ background: 'linear-gradient(135deg, var(--accent-lt) 0%, var(--surface) 100%)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Quick Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['📋 New Order','/orders'],['👤 Add Client','/customers'],['🏢 Suppliers','/suppliers']].map(([l,p]) => (
              <a key={p} href={p} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none', padding: '4px 0' }}>{l} →</a>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>System</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
            <div>Version <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text)' }}>2.0</span></div>
            <div>Currency <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text)' }}>AUD Base</span></div>
            <div>Status <span style={{ color: 'var(--green)', fontWeight: 600 }}>● Online</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

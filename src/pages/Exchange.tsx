import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCIES, CURRENCY_COLORS } from '../lib/api';
import { Customer, Wallet, Supplier, ExchangeRate } from '../lib/types';
import { Card, Btn, Input, Select, Textarea, PageHeader, CurrencyPill, Spinner, toast } from '../components/ui';

export function ExchangePage() {
  const qc = useQueryClient();

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [fromCurrency, setFromCurrency] = useState('AUD');
  const [toCurrency, setToCurrency] = useState('CNY');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [ourRate, setOurRate] = useState('');
  const [marketRate, setMarketRate] = useState('');
  const [feeRate, setFeeRate] = useState('0');
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [lastEdited, setLastEdited] = useState<'from' | 'to'>('from');

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });
  const { data: rates = [] } = useQuery<ExchangeRate[]>({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });
  const { data: wallets = [] } = useQuery<Wallet[]>({
    queryKey: ['customer-wallets', customerId],
    queryFn: () => api.get(`/customers/${customerId}/wallets`).then(r => r.data),
    enabled: !!customerId,
  });

  const selectedCustomer = customers.find(c => c.id === parseInt(customerId));
  const fromWallet = wallets.find(w => w.currency === fromCurrency);

  // Auto-fetch market rate
  useEffect(() => {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return;
    const rate = rates.find(r => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency);
    if (rate) {
      setMarketRate(rate.rate.toFixed(6));
      if (!ourRate) setOurRate(rate.rate.toFixed(6));
    }
  }, [fromCurrency, toCurrency, rates]);

  // Bi-directional calc
  useEffect(() => {
    const r = parseFloat(ourRate);
    const fee = parseFloat(feeRate) / 100;
    if (!r || isNaN(r)) return;

    if (lastEdited === 'from' && fromAmount) {
      const to = parseFloat(fromAmount) * r * (1 - fee);
      setToAmount(to.toFixed(4));
    } else if (lastEdited === 'to' && toAmount) {
      const from = parseFloat(toAmount) / (r * (1 - fee));
      setFromAmount(from.toFixed(4));
    }
  }, [ourRate, feeRate, fromAmount, toAmount, lastEdited]);

  const profit = (() => {
    const from = parseFloat(fromAmount) || 0;
    const to = parseFloat(toAmount) || 0;
    const mr = parseFloat(marketRate) || 0;
    return to - from * mr;
  })();

  const feeAmount = (() => {
    const from = parseFloat(fromAmount) || 0;
    const r = parseFloat(ourRate) || 0;
    const fee = parseFloat(feeRate) / 100;
    return from * r * fee;
  })();

  const submitMut = useMutation({
    mutationFn: () => api.post('/exchange', {
      customerId: parseInt(customerId),
      supplierId: supplierId ? parseInt(supplierId) : null,
      fromCurrency, toCurrency,
      fromAmount: parseFloat(fromAmount),
      toAmount: parseFloat(toAmount),
      marketRate: parseFloat(marketRate),
      ourRate: parseFloat(ourRate),
      feeRate: parseFloat(feeRate),
      feeAmount, profit, note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-wallets', customerId] });
      qc.invalidateQueries({ queryKey: ['customer-txs', customerId] });
      qc.invalidateQueries({ queryKey: ['dash-stats'] });
      toast(`Exchange completed! Profit: A$${fmt(profit)}`);
      setFromAmount(''); setToAmount(''); setNote('');
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Exchange failed', 'error'),
  });

  const canSubmit = customerId && fromCurrency && toCurrency && fromAmount && toAmount && ourRate && fromCurrency !== toCurrency;

  return (
    <div>
      <PageHeader title="Currency Exchange" subtitle="Execute a currency exchange for a customer" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        {/* Left: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer */}
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Customer</h3>
            <Select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">— Select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
            </Select>
            {selectedCustomer && wallets.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {wallets.map(w => (
                  <span key={w.id} style={{ fontSize: 13, color: CURRENCY_COLORS[w.currency] || 'var(--text2)', fontFamily: "'DM Mono',monospace" }}>
                    {w.currency} {fmt(w.balance)}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Currencies & Amounts */}
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Exchange</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Select label="From Currency" value={fromCurrency} onChange={e => setFromCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label={`Amount ${fromWallet ? `(Balance: ${fmt(fromWallet.balance)})` : ''}`} type="number" step="0.01" value={fromAmount}
                  onChange={e => { setFromAmount(e.target.value); setLastEdited('from'); }} placeholder="0.00" />
              </div>
              <div>
                <Select label="To Currency" value={toCurrency} onChange={e => setToCurrency(e.target.value)}>
                  {CURRENCIES.filter(c => c !== fromCurrency).map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label="Amount" type="number" step="0.01" value={toAmount}
                  onChange={e => { setToAmount(e.target.value); setLastEdited('to'); }} placeholder="0.00" />
              </div>
            </div>
          </Card>

          {/* Rates */}
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rates & Fees</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <Input label="Market Rate" type="number" step="0.000001" value={marketRate} onChange={e => setMarketRate(e.target.value)} />
                <p style={{ margin: '-8px 0 14px', fontSize: 11, color: 'var(--text3)' }}>Reference only, auto-fetched</p>
              </div>
              <Input label="Our Rate (applied)" type="number" step="0.000001" value={ourRate} onChange={e => { setOurRate(e.target.value); }} />
              <Input label="Fee %" type="number" step="0.01" value={feeRate} onChange={e => setFeeRate(e.target.value)} placeholder="0" />
            </div>
          </Card>

          {/* Supplier */}
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Supplier (Optional)</h3>
            <Select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— No supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            {supplierId && <p style={{ margin: '-8px 0 0', fontSize: 12, color: 'var(--gold)' }}>⚠ A PENDING supplier payment will be auto-created</p>}
          </Card>

          <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional notes…" />
        </div>

        {/* Right: Preview */}
        <div style={{ position: 'sticky', top: 0 }}>
          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Preview</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CUSTOMER PAYS</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                <span style={{ color: CURRENCY_COLORS[fromCurrency] }}>{fromCurrency}</span>{' '}
                <span>{fromAmount ? fmt(fromAmount) : '—'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CUSTOMER RECEIVES</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                <span style={{ color: CURRENCY_COLORS[toCurrency] }}>{toCurrency}</span>{' '}
                <span style={{ color: 'var(--green)' }}>{toAmount ? fmt(toAmount) : '—'}</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Market Rate</span>
                <span style={{ fontFamily: "'DM Mono',monospace" }}>{marketRate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Our Rate</span>
                <span style={{ fontFamily: "'DM Mono',monospace" }}>{ourRate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Fee ({feeRate}%)</span>
                <span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--gold)' }}>{feeAmount ? fmt(feeAmount) : '—'}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Est. Profit</span>
                <span style={{ fontFamily: "'DM Mono',monospace", color: profit > 0 ? 'var(--green)' : profit < 0 ? 'var(--red)' : 'var(--text)', fontWeight: 700 }}>
                  {profit ? `${CURRENCY_COLORS[toCurrency] ? '' : ''}${fmt(Math.abs(profit))} ${toCurrency}` : '—'}
                </span>
              </div>
            </div>

            {supplierId && (
              <div style={{ background: '#78350f22', border: '1px solid #78350f', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#fcd34d' }}>
                Supplier: <strong>{suppliers.find(s => s.id === parseInt(supplierId))?.name}</strong><br />
                Will receive: <strong>{fromAmount ? fmt(fromAmount) : '—'} {fromCurrency}</strong>
              </div>
            )}

            <Btn style={{ width: '100%', justifyContent: 'center' }} disabled={!canSubmit} loading={submitMut.isPending} onClick={() => submitMut.mutate()}>
              ⇄ Execute Exchange
            </Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}

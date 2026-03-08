import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmt, CURRENCIES, CURRENCY_COLORS } from '../lib/api';
import { Customer, Wallet, Supplier, ExchangeRate } from '../lib/types';
import { Card, Btn, Input, Select, Textarea, PageHeader, CurrencyPill, Spinner, toast } from '../components/ui';

export function ExchangePage() {
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [fromCurrency, setFromCurrency] = useState('AUD');
  const [toCurrency, setToCurrency] = useState('CNY');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [clientRate, setClientRate] = useState('');      // Rate we give to client
  const [supplierRate, setSupplierRate] = useState('');  // Rate we get from supplier (our cost)
  const [marketRate, setMarketRate] = useState('');      // Live market reference
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

  // Auto-fetch market rate and pre-fill client/supplier rate
  useEffect(() => {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return;
    const rate = rates.find(r => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency);
    if (rate) {
      const r = parseFloat(rate.rate as any);
      setMarketRate(r.toFixed(6));
      // Only auto-set if empty
      if (!clientRate) setClientRate(r.toFixed(6));
      if (!supplierRate) setSupplierRate(r.toFixed(6));
    }
  }, [fromCurrency, toCurrency, rates]);

  // Bi-directional calc based on CLIENT rate (what customer gets)
  useEffect(() => {
    const r = parseFloat(clientRate);
    const fee = parseFloat(feeRate) / 100;
    if (!r || isNaN(r)) return;
    if (lastEdited === 'from' && fromAmount) {
      const to = parseFloat(fromAmount) * r * (1 - fee);
      setToAmount(to.toFixed(4));
    } else if (lastEdited === 'to' && toAmount) {
      const from = parseFloat(toAmount) / (r * (1 - fee));
      setFromAmount(from.toFixed(4));
    }
  }, [clientRate, feeRate, fromAmount, toAmount, lastEdited]);

  // Profit = (clientRate - supplierRate) × fromAmount
  // = what we earn per unit of fromCurrency exchanged
  // expressed in toCurrency, then converted to fromCurrency for reporting
  const profitCalc = (() => {
    const from = parseFloat(fromAmount) || 0;
    const cr = parseFloat(clientRate) || 0;   // e.g. 4.85 AUD/CNY given to client
    const sr = parseFloat(supplierRate) || 0; // e.g. 4.90 AUD/CNY we pay to supplier
    if (!from || !cr || !sr) return { profitInTo: 0, profitInFrom: 0 };

    // toAmount from client side = from * clientRate
    // Cost from supplier side   = from * supplierRate
    // Profit in toCurrency      = from * clientRate - from * supplierRate
    //                           = from * (clientRate - supplierRate)
    const profitInTo = from * (cr - sr);

    // Convert profit to fromCurrency for AUD display
    const profitInFrom = cr > 0 ? profitInTo / cr : 0;

    return { profitInTo, profitInFrom };
  })();

  const { profitInTo, profitInFrom } = profitCalc;

  const feeAmount = (() => {
    const from = parseFloat(fromAmount) || 0;
    const r = parseFloat(clientRate) || 0;
    const fee = parseFloat(feeRate) / 100;
    return from * r * fee;
  })();

  // Store profit in toCurrency in DB, dashboard converts using rates
  const submitMut = useMutation({
    mutationFn: () => api.post('/exchange', {
      customerId: parseInt(customerId),
      supplierId: supplierId ? parseInt(supplierId) : null,
      fromCurrency, toCurrency,
      fromAmount: parseFloat(fromAmount),
      toAmount: parseFloat(toAmount),
      marketRate: parseFloat(marketRate) || parseFloat(clientRate),
      ourRate: parseFloat(clientRate),
      supplierRate: parseFloat(supplierRate),
      feeRate: parseFloat(feeRate),
      feeAmount,
      profit: profitInFrom, // store in fromCurrency (AUD) for consistent reporting
      note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-wallets', customerId] });
      qc.invalidateQueries({ queryKey: ['customer-txs', customerId] });
      qc.invalidateQueries({ queryKey: ['dash-stats'] });
      const sign = profitInFrom >= 0 ? '+' : '';
      toast(`Exchange done! Profit: ${sign}${fmt(profitInFrom)} ${fromCurrency}`);
      setFromAmount(''); setToAmount(''); setNote('');
    },
    onError: (e: any) => toast(e?.response?.data?.error || 'Exchange failed', 'error'),
  });

  const canSubmit = customerId && fromCurrency && toCurrency && fromAmount && toAmount && clientRate && fromCurrency !== toCurrency;

  const rateSpread = parseFloat(clientRate) && parseFloat(supplierRate)
    ? parseFloat(clientRate) - parseFloat(supplierRate)
    : null;

  return (
    <div>
      <PageHeader title="Currency Exchange" subtitle="Execute a currency exchange for a customer" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20, alignItems: 'start' }}>
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
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Exchange Amount</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Select label="From Currency" value={fromCurrency} onChange={e => { setFromCurrency(e.target.value); setClientRate(''); setSupplierRate(''); }}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label={`Amount ${fromWallet ? `(Balance: ${fmt(fromWallet.balance)})` : ''}`} type="number" step="0.01" value={fromAmount}
                  onChange={e => { setFromAmount(e.target.value); setLastEdited('from'); }} placeholder="0.00" />
              </div>
              <div>
                <Select label="To Currency" value={toCurrency} onChange={e => { setToCurrency(e.target.value); setClientRate(''); setSupplierRate(''); }}>
                  {CURRENCIES.filter(c => c !== fromCurrency).map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label="Amount (auto-calculated)" type="number" step="0.01" value={toAmount}
                  onChange={e => { setToAmount(e.target.value); setLastEdited('to'); }} placeholder="0.00" />
              </div>
            </div>
          </Card>

          {/* Rates — the key section */}
          <Card>
            <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rates</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text3)' }}>
              Profit = (Client Rate − Supplier Rate) × {fromCurrency} Amount
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <Input
                  label={`Client Rate (${fromCurrency}→${toCurrency})`}
                  type="number" step="0.000001" value={clientRate}
                  onChange={e => setClientRate(e.target.value)}
                  placeholder="Rate given to client"
                />
                <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--text3)' }}>What client receives per 1 {fromCurrency}</p>
              </div>
              <div>
                <Input
                  label={`Supplier Rate (${fromCurrency}→${toCurrency})`}
                  type="number" step="0.000001" value={supplierRate}
                  onChange={e => setSupplierRate(e.target.value)}
                  placeholder="Rate from supplier"
                />
                <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--text3)' }}>What we pay supplier per 1 {fromCurrency}</p>
              </div>
              <div>
                <Input
                  label="Market Rate (reference)"
                  type="number" step="0.000001" value={marketRate}
                  onChange={e => setMarketRate(e.target.value)}
                />
                <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--text3)' }}>Live rate, auto-fetched</p>
              </div>
            </div>

            {rateSpread !== null && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 8,
                background: rateSpread >= 0 ? '#14532d22' : '#7f1d1d22',
                border: `1px solid ${rateSpread >= 0 ? '#166534' : '#991b1b'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Rate Spread: <strong style={{ fontFamily: "'DM Mono',monospace", color: rateSpread >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {rateSpread >= 0 ? '+' : ''}{rateSpread.toFixed(6)}
                  </strong>
                  {' '}per 1 {fromCurrency}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {rateSpread >= 0 ? '✅ Profitable' : '⚠️ Loss on spread'}
                </span>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
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
            {supplierId && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--gold)' }}>⚠ A PENDING supplier payment will be auto-created</p>}
          </Card>

          <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional notes…" />
        </div>

        {/* Right: Preview */}
        <div style={{ position: 'sticky', top: 0 }}>
          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Preview</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CUSTOMER PAYS</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                <span style={{ color: CURRENCY_COLORS[fromCurrency] }}>{fromCurrency}</span>{' '}
                <span>{fromAmount ? fmt(fromAmount) : '—'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CUSTOMER RECEIVES</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                <span style={{ color: CURRENCY_COLORS[toCurrency] }}>{toCurrency}</span>{' '}
                <span style={{ color: 'var(--green)' }}>{toAmount ? fmt(toAmount) : '—'}</span>
              </div>
            </div>

            {/* Rate breakdown */}
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Client Rate</span>
                <span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--blue)' }}>{clientRate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Supplier Rate</span>
                <span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--gold)' }}>{supplierRate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Market Rate</span>
                <span style={{ fontFamily: "'DM Mono',monospace" }}>{marketRate || '—'}</span>
              </div>
              {feeAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text3)' }}>Fee ({feeRate}%)</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--gold)' }}>{fmt(feeAmount)} {toCurrency}</span>
                </div>
              )}
            </div>

            {/* Profit breakdown */}
            <div style={{
              borderRadius: 10, padding: '12px 14px', marginBottom: 16,
              background: profitInFrom > 0 ? '#14532d33' : profitInFrom < 0 ? '#7f1d1d33' : 'var(--surface2)',
              border: `1px solid ${profitInFrom > 0 ? '#166534' : profitInFrom < 0 ? '#991b1b' : 'var(--border)'}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>PROFIT BREAKDOWN</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Client pays ({fromAmount || '0'} × {clientRate || '0'})</span>
                <span style={{ fontFamily: "'DM Mono',monospace" }}>{toAmount ? fmt(toAmount) : '—'} {toCurrency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Supplier cost ({fromAmount || '0'} × {supplierRate || '0'})</span>
                <span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--red)' }}>
                  {fromAmount && supplierRate ? fmt(parseFloat(fromAmount) * parseFloat(supplierRate)) : '—'} {toCurrency}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Net Profit</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 16,
                    color: profitInFrom > 0 ? 'var(--green)' : profitInFrom < 0 ? 'var(--red)' : 'var(--text)' }}>
                    {profitInTo !== 0 ? `${profitInTo >= 0 ? '+' : ''}${fmt(profitInTo)} ${toCurrency}` : '—'}
                  </div>
                  {profitInFrom !== 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
                      ≈ {profitInFrom >= 0 ? '+' : ''}{fmt(profitInFrom)} {fromCurrency}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {supplierId && (
              <div style={{ background: '#78350f22', border: '1px solid #78350f', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#fcd34d' }}>
                Supplier: <strong>{suppliers.find(s => s.id === parseInt(supplierId))?.name}</strong><br />
                Will pay: <strong>{fromAmount ? fmt(fromAmount) : '—'} {fromCurrency}</strong> at rate <strong>{supplierRate || '?'}</strong>
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

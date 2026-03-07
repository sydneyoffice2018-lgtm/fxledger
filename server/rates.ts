import { db } from './db';
import { exchangeRates } from '../shared/schema';
import { and, eq, desc } from 'drizzle-orm';

const CURRENCIES = ['AUD', 'CNY', 'USD', 'HKD', 'USDT', 'GBP', 'EUR'];

const STATIC_RATES: Record<string, number> = {
  'AUD/CNY': 4.86, 'AUD/USD': 0.635, 'AUD/HKD': 4.96,
  'AUD/GBP': 0.505, 'AUD/EUR': 0.59, 'AUD/USDT': 0.635,
  'CNY/AUD': 0.206, 'CNY/USD': 0.138, 'CNY/HKD': 1.08,
  'CNY/GBP': 0.104, 'CNY/EUR': 0.121, 'CNY/USDT': 0.138,
  'USD/CNY': 7.26, 'USD/AUD': 1.575, 'USD/HKD': 7.82,
  'USD/GBP': 0.795, 'USD/EUR': 0.93, 'USD/USDT': 1.0,
  'HKD/AUD': 0.202, 'HKD/CNY': 0.926, 'HKD/USD': 0.128,
  'GBP/AUD': 1.98, 'GBP/CNY': 9.62, 'GBP/USD': 1.258,
  'EUR/AUD': 1.695, 'EUR/CNY': 7.82, 'EUR/USD': 1.075,
  'USDT/AUD': 1.575, 'USDT/CNY': 7.26, 'USDT/USD': 1.0,
};

async function fetchFromOpenExchangeRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return null;
    const data = await res.json() as { rates?: Record<string, number> };
    return data.rates || null;
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter(): Promise<Record<string, number> | null> {
  try {
    const symbols = 'AUD,CNY,HKD,GBP,EUR,USD';
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${symbols}`);
    if (!res.ok) return null;
    const data = await res.json() as { rates?: Record<string, number> };
    return data.rates ? { ...data.rates, USD: 1 } : null;
  } catch {
    return null;
  }
}

export async function refreshRates(): Promise<void> {
  let usdRates: Record<string, number> | null = null;

  usdRates = await fetchFromOpenExchangeRates();
  if (!usdRates) usdRates = await fetchFromFrankfurter();

  const rateEntries: { fromCurrency: string; toCurrency: string; rate: string; source: string }[] = [];
  const source = usdRates ? 'api' : 'static';

  for (const from of CURRENCIES) {
    for (const to of CURRENCIES) {
      if (from === to) continue;
      let rate: number;

      if (usdRates) {
        // usdRates[X] = how many X per 1 USD
        // rate from->to = usdRates[to] / usdRates[from]
        const fromRate = from === 'USD' ? 1 : (from === 'USDT' ? 1 : usdRates[from]);
        const toRate = to === 'USD' ? 1 : (to === 'USDT' ? 1 : usdRates[to]);
        if (!fromRate || !toRate) {
          rate = STATIC_RATES[`${from}/${to}`] || 1;
        } else {
          rate = toRate / fromRate;
        }
      } else {
        rate = STATIC_RATES[`${from}/${to}`] || 1;
      }

      rateEntries.push({ fromCurrency: from, toCurrency: to, rate: rate.toFixed(6), source });
    }
  }

  // Clear old rates and insert fresh ones
  await db.delete(exchangeRates);
  for (const entry of rateEntries) {
    await db.insert(exchangeRates).values(entry);
  }

  console.log(`✅ Exchange rates refreshed (${source})`);
}

export async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const rows = await db.select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.fromCurrency, from), eq(exchangeRates.toCurrency, to)))
    .orderBy(desc(exchangeRates.fetchedAt))
    .limit(1);

  if (rows.length > 0) return parseFloat(rows[0].rate);

  // Fallback to static
  return STATIC_RATES[`${from}/${to}`] || 1;
}

export async function getAllLatestRates(): Promise<Array<{ fromCurrency: string; toCurrency: string; rate: number; fetchedAt: Date }>> {
  const rows = await db.select().from(exchangeRates).orderBy(desc(exchangeRates.fetchedAt));
  const seen = new Set<string>();
  const result = [];
  for (const row of rows) {
    const key = `${row.fromCurrency}/${row.toCurrency}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ fromCurrency: row.fromCurrency, toCurrency: row.toCurrency, rate: parseFloat(row.rate), fetchedAt: row.fetchedAt });
    }
  }
  // If no DB rates, return static
  if (result.length === 0) {
    return Object.entries(STATIC_RATES).map(([key, rate]) => {
      const [from, to] = key.split('/');
      return { fromCurrency: from, toCurrency: to, rate, fetchedAt: new Date() };
    });
  }
  return result;
}

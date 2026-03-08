import axios from 'axios';

const TOKEN_KEY = 'fx_ledger_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Only redirect to /login on 401 if NOT already on login and NOT from the login endpoint
api.interceptors.response.use(
  res => res,
  err => {
    const isLoginEndpoint = err.config?.url?.includes('/auth/login');
    const isAlreadyOnLogin = typeof window !== 'undefined' && window.location.pathname === '/login';
    if (err.response?.status === 401 && !isLoginEndpoint && !isAlreadyOnLogin) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const fmt = (n: number | string, decimals = 2) =>
  Number(n).toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const fmtDateShort = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

export const CURRENCIES = ['AUD', 'CNY', 'USD', 'HKD', 'USDT', 'GBP', 'EUR'];

export const CURRENCY_COLORS: Record<string, string> = {
  AUD: '#3b82f6', CNY: '#ef4444', USD: '#22c55e',
  HKD: '#f59e0b', USDT: '#06b6d4', GBP: '#a78bfa', EUR: '#f97316',
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: 'A$', CNY: '¥', USD: '$', HKD: 'HK$', USDT: '₮', GBP: '£', EUR: '€',
};

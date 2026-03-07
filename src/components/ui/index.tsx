import React from 'react';
import { CURRENCY_COLORS } from '../../lib/api';

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
export function Btn({ children, variant = 'primary', size = 'md', loading, ...props }: BtnProps) {
  const vars: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border2)' },
    danger: { background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' },
    ghost: { background: 'transparent', color: 'var(--text3)', border: 'none' },
    success: { background: '#14532d', color: '#86efac', border: 'none' },
    gold: { background: '#78350f', color: '#fcd34d', border: 'none' },
  };
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 12px', fontSize: 12 },
    md: { padding: '8px 16px', fontSize: 13 },
    lg: { padding: '11px 24px', fontSize: 14 },
  };
  return (
    <button {...props} style={{ ...vars[variant], ...sizes[size], borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s', opacity: (props.disabled || loading) ? 0.6 : 1, ...props.style }}>
      {loading ? '⏳' : children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', color: 'var(--text2)', fontSize: 12, marginBottom: 5, fontWeight: 500 }}>{label}</label>}
      <input {...props} style={{ width: '100%', background: 'var(--surface2)', border: `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', ...props.style }} />
      {error && <p style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, children, ...props }: SelectProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', color: 'var(--text2)', fontSize: 12, marginBottom: 5, fontWeight: 500 }}>{label}</label>}
      <select {...props} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', colorScheme: 'dark', ...props.style }}>
        {children}
      </select>
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, ...props }: TextareaProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', color: 'var(--text2)', fontSize: 12, marginBottom: 5, fontWeight: 500 }}>{label}</label>}
      <textarea {...props} rows={3} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', ...props.style }} />
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
const txBadge: Record<string, { bg: string; color: string; label: string }> = {
  deposit:      { bg: '#14532d', color: '#86efac', label: 'DEPOSIT' },
  withdrawal:   { bg: '#450a0a', color: '#fca5a5', label: 'WITHDRAW' },
  exchange_in:  { bg: '#1e3a8a', color: '#93c5fd', label: 'EXCH IN' },
  exchange_out: { bg: '#7c2d12', color: '#fdba74', label: 'EXCH OUT' },
  transfer_in:  { bg: '#164e63', color: '#67e8f9', label: 'TRANSFER IN' },
  transfer_out: { bg: '#312e81', color: '#c4b5fd', label: 'TRANSFER OUT' },
  pending:      { bg: '#78350f', color: '#fcd34d', label: 'PENDING' },
  completed:    { bg: '#14532d', color: '#86efac', label: 'COMPLETED' },
  cancelled:    { bg: '#1c1917', color: '#a8a29e', label: 'CANCELLED' },
};

export function TxBadge({ type }: { type: string }) {
  const s = txBadge[type] || { bg: '#1e2433', color: '#94a3b8', label: type.toUpperCase() };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{s.label}</span>;
}

// ── CurrencyPill ───────────────────────────────────────────────────────────
export function CurrencyPill({ currency }: { currency: string }) {
  return <span style={{ color: CURRENCY_COLORS[currency] || '#94a3b8', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>{currency}</span>;
}

// ── StatCard ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: string }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>{label}</div>
          <div style={{ color: color || 'var(--text)', fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: 0.4 }}>{icon}</span>}
      </div>
    </Card>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--text3)', fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
export function Empty({ msg = 'No data found' }: { msg?: string }) {
  return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>{msg}</div>;
}

// ── Table ──────────────────────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: 'var(--text3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{ borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      {children}
    </tr>
  );
}

export function Td({ children, mono, muted, style }: { children: React.ReactNode; mono?: boolean; muted?: boolean; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '12px 14px', fontFamily: mono ? "'DM Mono', monospace" : undefined, color: muted ? 'var(--text3)' : undefined, ...style }}>
      {children}
    </td>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: 'success' | 'error' }
let _setToast: ((t: ToastState | null) => void) | null = null;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  _setToast = setToast;
  React.useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  return (
    <>
      {children}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--surface)', border: `1px solid ${toast.type === 'error' ? 'var(--red)' : 'var(--green)'}`, borderRadius: 10, padding: '12px 20px', color: toast.type === 'error' ? 'var(--red)' : 'var(--green)', fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', maxWidth: 320 }}>
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.msg}
        </div>
      )}
    </>
  );
}

export function toast(msg: string, type: 'success' | 'error' = 'success') {
  _setToast?.({ msg, type });
}

// ── Divider ────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />;
}

// ── Loading spinner ────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

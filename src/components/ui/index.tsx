import React from 'react';
import { CURRENCY_COLORS } from '../../lib/api';

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style, onClick }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div className={className} onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
      boxShadow: 'var(--shadow-sm)',
      cursor: onClick ? 'pointer' : undefined,
      transition: onClick ? 'box-shadow 0.15s, transform 0.1s' : undefined,
      ...style
    }}
    onMouseEnter={onClick ? e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; } : undefined}
    onMouseLeave={onClick ? e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; } : undefined}
    >
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
export function Btn({ children, variant = 'primary', size = 'md', loading, ...props }: BtnProps) {
  const vars: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--accent)',  color: '#fff',            border: 'none', boxShadow: '0 2px 8px rgba(26,47,85,0.25)' },
    secondary: { background: 'var(--surface)', color: 'var(--text2)',    border: '1px solid var(--border2)' },
    danger:    { background: 'var(--red-lt)',  color: 'var(--red)',       border: '1px solid #f5c6c2' },
    ghost:     { background: 'transparent',    color: 'var(--text3)',     border: 'none' },
    success:   { background: 'var(--green-lt)',color: 'var(--green)',     border: '1px solid #b7e4d0' },
    gold:      { background: 'var(--gold-lt)', color: 'var(--gold)',      border: '1px solid #f9d79a' },
  };
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 12px', fontSize: 12, borderRadius: 7 },
    md: { padding: '8px 18px', fontSize: 13, borderRadius: 9 },
    lg: { padding: '12px 28px', fontSize: 14, borderRadius: 10 },
  };
  return (
    <button {...props}
      style={{ ...vars[variant], ...sizes[size], fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', opacity: (props.disabled || loading) ? 0.5 : 1, fontFamily: 'inherit', ...props.style }}
      onMouseEnter={e => { if (!props.disabled && !loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(0.93)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {loading ? <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string;
}
export function Input({ label, error, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', color: 'var(--text2)', fontSize: 11, marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>}
      <input {...props} style={{
        width: '100%', background: 'var(--surface)',
        border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 9, padding: '9px 13px',
        color: 'var(--text)', fontSize: 14,
        outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        ...props.style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,47,85,0.08)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      {error && <p style={{ color: 'var(--red)', fontSize: 11, marginTop: 4, margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, children, ...props }: SelectProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', color: 'var(--text2)', fontSize: 11, marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>}
      <select {...props} style={{
        width: '100%', background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 9, padding: '9px 13px',
        color: 'var(--text)', fontSize: 14,
        outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        appearance: 'none', cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a8799' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 13px center',
        paddingRight: 36,
        ...props.style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,47,85,0.08)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {children}
      </select>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, ...props }: TextareaProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', color: 'var(--text2)', fontSize: 11, marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>}
      <textarea {...props} rows={3} style={{
        width: '100%', background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 9, padding: '9px 13px',
        color: 'var(--text)', fontSize: 14,
        outline: 'none', resize: 'vertical',
        transition: 'border-color 0.15s',
        ...props.style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,47,85,0.08)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 540, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number; wide?: boolean;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 18, padding: 32,
        width: '100%', maxWidth: wide ? 800 : width,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        animation: 'modal-in 0.2s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'var(--surface3)', border: 'none', color: 'var(--text3)',
            width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── TxBadge ───────────────────────────────────────────────────────────────────
const txBadge: Record<string, { bg: string; color: string; label: string }> = {
  deposit:      { bg: 'var(--green-lt)', color: 'var(--green)',   label: 'DEPOSIT' },
  withdrawal:   { bg: 'var(--red-lt)',   color: 'var(--red)',     label: 'WITHDRAW' },
  exchange_in:  { bg: 'var(--blue-lt)',  color: 'var(--blue)',    label: 'EXCH IN' },
  exchange_out: { bg: 'var(--gold-lt)',  color: 'var(--gold)',    label: 'EXCH OUT' },
  transfer_in:  { bg: 'var(--cyan-lt)',  color: 'var(--cyan)',    label: 'TRANSFER IN' },
  transfer_out: { bg: 'var(--purple-lt)',color: 'var(--purple)',  label: 'TRANSFER OUT' },
  pending:      { bg: 'var(--gold-lt)',  color: 'var(--gold)',    label: 'PENDING' },
  completed:    { bg: 'var(--green-lt)', color: 'var(--green)',   label: 'COMPLETED' },
  cancelled:    { bg: 'var(--surface3)', color: 'var(--text3)',   label: 'CANCELLED' },
};
export function TxBadge({ type }: { type: string }) {
  const s = txBadge[type] || { bg: 'var(--surface3)', color: 'var(--text3)', label: type.toUpperCase() };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{s.label}</span>;
}

// ── CurrencyPill ──────────────────────────────────────────────────────────────
export function CurrencyPill({ currency }: { currency: string }) {
  return <span style={{ color: CURRENCY_COLORS[currency] || 'var(--text3)', fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono, monospace' }}>{currency}</span>;
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon, accent }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string; accent?: boolean;
}) {
  return (
    <Card style={accent ? { background: 'var(--accent)', border: 'none', boxShadow: '0 4px 16px rgba(26,47,85,0.2)' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: accent ? 'rgba(255,255,255,0.65)' : 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>{label}</div>
          <div style={{ color: color || (accent ? '#fff' : 'var(--text)'), fontSize: 26, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: accent ? 'rgba(255,255,255,0.55)' : 'var(--text3)', fontSize: 12, marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 24, opacity: 0.35 }}>{icon}</span>}
      </div>
    </Card>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '5px 0 0', color: 'var(--text3)', fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastItem { id: number; msg: string; type: 'success' | 'error' | 'info' }
let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;
export function toast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  const id = Date.now();
  _setToasts?.(t => [...t, { id, msg, type }]);
  setTimeout(() => _setToasts?.(t => t.filter(x => x.id !== id)), 3200);
}
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  _setToasts = setToasts;
  const colors = { success: { bg: 'var(--green-lt)', border: '#b7e4d0', color: 'var(--green)', icon: '✓' }, error: { bg: 'var(--red-lt)', border: '#f5c6c2', color: 'var(--red)', icon: '✕' }, info: { bg: 'var(--blue-lt)', border: '#bfcfff', color: 'var(--blue)', icon: 'ℹ' } };
  return (
    <>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div key={t.id} style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: 8, animation: 'slide-in 0.2s ease-out' }}>
              <span>{c.icon}</span> {t.msg}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modal-in { from { opacity:0; transform: scale(0.96) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }
        @keyframes slide-in { from { opacity:0; transform: translateX(16px); } to { opacity:1; transform: translateX(0); } }
      `}</style>
    </>
  );
}

// ── Table helpers ─────────────────────────────────────────────────────────────
export function Table({ children, headers }: { children: React.ReactNode; headers: string[] }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
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
    <tr onClick={onClick} style={{
      borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : undefined, transition: 'background 0.1s',
    }}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {children}
    </tr>
  );
}

export function Td({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)', verticalAlign: 'middle', ...style }}>{children}</td>;
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', title, message, action }: { icon?: string; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text2)' }}>{title}</div>
      {message && <div style={{ fontSize: 13, marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>{message}</div>}
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

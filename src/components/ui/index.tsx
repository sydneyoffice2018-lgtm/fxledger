import React from 'react';
import { CURRENCY_COLORS } from '../../lib/api';

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style, onClick, accent }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <div className={className} onClick={onClick} style={{
      background: 'var(--surface)',
      border: `1px solid ${accent ? 'rgba(232,160,32,0.3)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: 20,
      boxShadow: accent ? 'var(--glow-accent)' : 'var(--shadow-sm)',
      cursor: onClick ? 'pointer' : undefined,
      transition: 'all 0.2s',
      animation: 'fadeUp 0.3s ease both',
      ...style
    }}
    onMouseEnter={onClick ? e => {
      const el = e.currentTarget as HTMLElement;
      el.style.borderColor = 'var(--border2)';
      el.style.transform = 'translateY(-2px)';
      el.style.boxShadow = 'var(--shadow-md)';
    } : undefined}
    onMouseLeave={onClick ? e => {
      const el = e.currentTarget as HTMLElement;
      el.style.borderColor = 'var(--border)';
      el.style.transform = 'translateY(0)';
      el.style.boxShadow = 'var(--shadow-sm)';
    } : undefined}
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
    primary:   { background: 'var(--accent)', color: '#0c0e12', border: 'none', fontWeight: 700 },
    secondary: { background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)' },
    danger:    { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(240,64,96,0.3)' },
    ghost:     { background: 'transparent', color: 'var(--text3)', border: 'none' },
    success:   { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.3)' },
    gold:      { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(232,160,32,0.3)' },
  };
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 12px', fontSize: 12, borderRadius: 7, height: 28 },
    md: { padding: '8px 18px', fontSize: 13, borderRadius: 9, height: 36 },
    lg: { padding: '11px 28px', fontSize: 14, borderRadius: 10, height: 44 },
  };
  return (
    <button {...props}
      style={{
        ...vars[variant], ...sizes[size],
        fontWeight: 600, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'all 0.15s',
        opacity: (props.disabled || loading) ? 0.4 : 1,
        fontFamily: 'inherit',
        letterSpacing: variant === 'primary' ? '0.01em' : undefined,
        ...props.style,
      }}
      onMouseEnter={e => { if (!props.disabled && !loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {loading
        ? <span style={{ display:'inline-block', width:13, height:13, border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        : children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string;
}
export function Input({ label, error, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <input {...props} style={{
        width: '100%',
        background: 'var(--surface2)',
        border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 8, padding: '9px 12px',
        color: 'var(--text)', fontSize: 14,
        outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        ...props.style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      {error && <p style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, children, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <select {...props} style={{
        width: '100%', background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '9px 12px',
        color: 'var(--text)', fontSize: 14,
        outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        appearance: 'none', cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236b7585' d='M5 7L0.67 2h8.66z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        paddingRight: 32,
        ...props.style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>}
      <textarea {...props} rows={3} style={{
        width: '100%', background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '9px 12px',
        color: 'var(--text)', fontSize: 14, resize: 'vertical',
        outline: 'none', transition: 'border-color 0.15s',
        fontFamily: 'inherit',
        ...props.style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4, fontWeight: 400 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {icon && (
        <div style={{ position: 'absolute', right: 16, top: 14, fontSize: 22, opacity: 0.15 }}>{icon}</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: color || 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'var(--text3)', bg = 'var(--surface3)' }: {
  children: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
      color, background: bg, padding: '3px 9px', borderRadius: 20,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children, empty }: {
  headers: string[]; children: React.ReactNode; empty?: string;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{
                padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'var(--surface2)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text4)', fontSize: 13 }}>{empty}</div>
      )}
    </div>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{
      borderBottom: '1px solid var(--border)',
      cursor: onClick ? 'pointer' : undefined,
      transition: 'background 0.12s',
    }}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
    onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {children}
    </tr>
  );
}

export function TD({ children, mono, right, muted, style }: {
  children: React.ReactNode; mono?: boolean; right?: boolean; muted?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td style={{
      padding: '12px 16px', fontSize: 13,
      fontFamily: mono ? "'JetBrains Mono',monospace" : undefined,
      textAlign: right ? 'right' : 'left',
      color: muted ? 'var(--text3)' : 'var(--text)',
      ...style
    }}>
      {children}
    </td>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open = true, onClose, title, children, wide, width }: {
  open?: boolean; onClose: () => void;
  title: string; children: React.ReactNode; wide?: boolean; width?: number;
}) {
  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'fadeUp 0.15s ease',
      }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 14, width: '100%',
        maxWidth: width ? width : wide ? 780 : 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 7, width: 30, height: 30, cursor: 'pointer',
            color: 'var(--text3)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastFn: ((msg: string, type?: 'success' | 'error' | 'info') => void) | null = null;
export function toast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  _toastFn?.(msg, type);
}
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<{ id: number; msg: string; type: string }[]>([]);
  _toastFn = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  const colors: Record<string, string> = { success: 'var(--green)', error: 'var(--red)', info: 'var(--blue)' };
  return (
    <>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'var(--surface2)', border: `1px solid ${colors[t.type]}40`,
            borderLeft: `3px solid ${colors[t.type]}`,
            borderRadius: 9, padding: '10px 16px',
            fontSize: 13, fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeUp 0.2s ease',
            color: 'var(--text)',
          }}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}

// ── Mono number ───────────────────────────────────────────────────────────────
export function Mono({ children, color, size }: { children: React.ReactNode; color?: string; size?: number }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: color || 'var(--text)', fontSize: size, fontWeight: 500 }}>
      {children}
    </span>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 0 8px' }}>
      {children}
    </div>
  );
}

// ── Legacy aliases (used by Customers, Transactions, Exchange pages) ──────────
export function CurrencyPill({ currency }: { currency: string }) {
  const c = CURRENCY_COLORS[currency] || 'var(--text3)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 700,
      color: c, background: c + '18',
      border: `1px solid ${c}30`,
      padding: '2px 8px', borderRadius: 12,
      letterSpacing: '0.04em',
    }}>{currency}</span>
  );
}

export function TxBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    deposit:     { label: 'Deposit',    color: 'var(--green)' },
    withdrawal:  { label: 'Withdrawal', color: 'var(--red)' },
    exchange_in: { label: 'FX In',      color: 'var(--blue)' },
    exchange_out:{ label: 'FX Out',     color: 'var(--purple)' },
    transfer_in: { label: 'Xfer In',    color: 'var(--cyan)' },
    transfer_out:{ label: 'Xfer Out',   color: 'var(--accent)' },
  };
  const s = map[type] || { label: type, color: 'var(--text3)' };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export function Empty({ icon = '◯', text, msg }: { icon?: string; text?: string; msg?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text4)' }}>
      <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

// Old Table/Tr/Td aliases
export const Tr = TR;
export const Td = TD;

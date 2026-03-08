import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useAuth } from '../../hooks/useAuth';

/**
 * Navigation is structured around the MONEY FLOW:
 *
 *  1. PAPER         — Client brings paper, we record intake
 *  2. SUPPLIER      — We send to supplier
 *  3. OUR BANKS     — Our company accounts, deposits in/out
 *  4. EXCHANGE      — The FX conversion (rates, orders)
 *  5. PAYOUT        — Paying out to client's bank / wallet
 *
 *  Supporting:
 *  — CLIENTS        — Client directory
 *  — LEDGER         — Full transaction history
 *  — ADMIN          — Users
 */

const FLOW_STEPS = [
  {
    step: 1,
    id: 'paper',
    label: 'Paper',
    path: '/paper',
    color: '#f59e0b',
    desc: 'Client intake',
  },
  {
    step: 2,
    id: 'suppliers',
    label: 'Supplier',
    path: '/suppliers',
    color: '#8b5cf6',
    desc: 'Send to supplier',
  },
  {
    step: 3,
    id: 'accounts',
    label: 'Our Banks',
    path: '/accounts',
    color: '#3b82f6',
    desc: 'Company accounts',
  },
  {
    step: 4,
    id: 'exchange',
    label: 'Exchange',
    path: '/exchange',
    color: '#06b6d4',
    desc: 'FX conversion',
  },
  {
    step: 5,
    id: 'payout',
    label: 'Payout',
    path: '/payout',
    color: '#22c55e',
    desc: "Client's bank/wallet",
  },
];

const SUPPORT_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'clients',   label: 'Clients',   path: '/customers' },
  { id: 'ledger',    label: 'Ledger',    path: '/transactions' },
];

const ADMIN_ITEMS = [
  { id: 'users', label: 'Users', path: '/users' },
];

function FlowNavItem({ step, id, label, path, color, desc, collapsed }: typeof FLOW_STEPS[0] & { collapsed: boolean }) {
  const [active] = useRoute(path === '/' ? '/' : path + '{/:rest*}');
  const isActive = path === '/' ? window.location.pathname === '/' : active;

  return (
    <Link href={path}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 12,
        padding: collapsed ? '10px 0' : '9px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s',
        background: isActive ? color + '15' : 'transparent',
        position: 'relative',
        marginBottom: 2,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = color + '08'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {/* Step number circle */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? color : 'var(--surface3)',
          border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
          fontSize: 11,
          fontWeight: 800,
          color: isActive ? '#fff' : 'var(--text4)',
          transition: 'all 0.2s',
          boxShadow: isActive ? `0 0 10px ${color}50` : 'none',
        }}>
          {step}
        </div>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? color : 'var(--text2)',
              lineHeight: 1.2,
            }}>
              {label}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{desc}</div>
          </div>
        )}

        {/* Active right-glow bar */}
        {isActive && !collapsed && (
          <div style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 20, background: color, borderRadius: 2,
            boxShadow: `0 0 6px ${color}`,
          }} />
        )}
      </div>
    </Link>
  );
}

function SupportNavItem({ id, label, path, collapsed }: typeof SUPPORT_ITEMS[0] & { collapsed: boolean }) {
  const [active] = useRoute(path === '/' ? '/' : path + '{/:rest*}');
  const isActive = path === '/' ? window.location.pathname === '/' : active;

  return (
    <Link href={path}>
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 8, padding: collapsed ? '7px 0' : '7px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 7, cursor: 'pointer', marginBottom: 1,
        transition: 'all 0.15s',
        background: isActive ? 'var(--surface3)' : 'transparent',
        color: isActive ? 'var(--text)' : 'var(--text4)',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text4)'; } }}
      >
        <div style={{
          width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
          background: isActive ? 'var(--accent)' : 'var(--surface4)',
        }} />
        {!collapsed && (
          <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{label}</span>
        )}
      </div>
    </Link>
  );
}

// Connector line between steps
function FlowConnector({ color, collapsed }: { color: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
        <div style={{ width: 1, height: 10, background: 'var(--border)', borderRadius: 1 }} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0 2px 26px', gap: 0 }}>
      <div style={{ width: 1, height: 12, background: `linear-gradient(to bottom, ${color}60, var(--border))`, borderRadius: 1, marginLeft: 13 }} />
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 54 : 224,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          height: 58,
          display: 'flex',
          alignItems: 'center',
          padding: '0 13px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          gap: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 30, height: 30,
            borderRadius: 8,
            flexShrink: 0,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, color: '#0c0e12',
            letterSpacing: '-0.03em',
          }}>FX</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                FX Ledger
              </div>
              <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Remittance
              </div>
            </div>
          )}
        </div>

        {/* Nav content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '14px 4px' : '14px 10px' }}>

          {/* MONEY FLOW section */}
          {!collapsed && (
            <div style={{
              fontSize: 9, fontWeight: 800, color: 'var(--text4)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '0 12px 10px',
            }}>
              Money Flow
            </div>
          )}

          {FLOW_STEPS.map((step, i) => (
            <div key={step.id}>
              <FlowNavItem {...step} collapsed={collapsed} />
              {i < FLOW_STEPS.length - 1 && (
                <FlowConnector color={step.color} collapsed={collapsed} />
              )}
            </div>
          ))}

          {/* Divider */}
          <div style={{ margin: '16px 0 10px', borderTop: '1px solid var(--border)' }} />

          {/* Support items */}
          {!collapsed && (
            <div style={{
              fontSize: 9, fontWeight: 800, color: 'var(--text4)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '0 12px 8px',
            }}>
              General
            </div>
          )}
          {SUPPORT_ITEMS.map(item => (
            <SupportNavItem key={item.id} {...item} collapsed={collapsed} />
          ))}

          {/* Admin */}
          {user?.role === 'admin' && (
            <>
              <div style={{ margin: '12px 0 8px', borderTop: '1px solid var(--border)' }} />
              {!collapsed && (
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text4)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 12px 8px' }}>
                  Admin
                </div>
              )}
              {ADMIN_ITEMS.map(item => (
                <SupportNavItem key={item.id} {...item} collapsed={collapsed} />
              ))}
            </>
          )}
        </div>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '10px 4px' : '10px' }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 8px 10px',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(232,160,32,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.2 }}>{user?.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => logout()}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: collapsed ? '7px' : '6px 10px',
              color: 'var(--text4)', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 6, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text4)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            <span>↩</span>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'none', border: 'none',
            borderTop: '1px solid var(--border)',
            color: 'var(--text4)', cursor: 'pointer',
            padding: '7px', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text3)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text4)')}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{
        flex: 1, overflowY: 'auto',
        padding: '32px 36px',
        background: 'var(--bg)',
      }}>
        {children}
      </main>
    </div>
  );
}

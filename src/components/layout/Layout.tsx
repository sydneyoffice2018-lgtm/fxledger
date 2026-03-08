import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useAuth } from '../../hooks/useAuth';

// Nav structure: sections with items
const NAV_SECTIONS = [
  {
    label: 'Workflow',
    items: [
      { id: 'dashboard', label: 'Overview',     icon: '▦',  path: '/' },
      { id: 'orders',    label: 'Orders',        icon: '⟳',  path: '/orders', tag: 'MAIN' },
    ]
  },
  {
    label: 'Directory',
    items: [
      { id: 'customers', label: 'Clients',        icon: '◉', path: '/customers' },
      { id: 'suppliers', label: 'Suppliers',      icon: '⬡', path: '/suppliers' },
      { id: 'accounts',  label: 'Our Accounts',   icon: '⬕', path: '/accounts' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'exchange',     label: 'Quick FX',  icon: '⇄', path: '/exchange' },
      { id: 'transactions', label: 'Ledger',    icon: '≡', path: '/transactions' },
    ]
  },
];

const ADMIN_SECTION = {
  label: 'Admin',
  items: [
    { id: 'users', label: 'Users', icon: '◈', path: '/users', adminOnly: true },
  ]
};

function NavItem({ id, label, icon, path, tag, collapsed }: {
  id: string; label: string; icon: string; path: string;
  tag?: string; collapsed: boolean;
}) {
  const [active] = useRoute(path === '/' ? '/' : path + '{/:rest*}');
  const isActive = path === '/' ? window.location.pathname === '/' : active;

  return (
    <Link href={path}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '9px 0' : '8px 10px',
        borderRadius: 8, cursor: 'pointer', marginBottom: 1,
        justifyContent: collapsed ? 'center' : 'flex-start',
        transition: 'all 0.15s',
        background: isActive ? 'rgba(232,160,32,0.1)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text3)',
        position: 'relative',
      }}>
        {/* Active indicator bar */}
        {isActive && !collapsed && (
          <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 18, background: 'var(--accent)', borderRadius: 2,
          }} />
        )}
        <span style={{
          fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0,
          color: isActive ? 'var(--accent)' : 'var(--text3)',
        }}>
          {icon}
        </span>
        {!collapsed && (
          <>
            <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, flex: 1, whiteSpace: 'nowrap' }}>
              {label}
            </span>
            {tag && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                color: 'var(--accent)', background: 'var(--accent-dim)',
                padding: '2px 6px', borderRadius: 4,
              }}>{tag}</span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const w = collapsed ? 56 : 220;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: w, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0, gap: 10, overflow: 'hidden',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#0c0e12',
            letterSpacing: '-0.02em',
          }}>FX</div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>FX Ledger</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Remittance System</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '12px 10px' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: 16 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text4)',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0 10px 6px',
                }}>
                  {section.label}
                </div>
              )}
              {section.items.map(item => (
                <NavItem key={item.id} {...item} collapsed={collapsed} />
              ))}
            </div>
          ))}

          {user?.role === 'admin' && (
            <div style={{ marginBottom: 16 }}>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 10px 6px' }}>
                  Admin
                </div>
              )}
              {ADMIN_SECTION.items.map(item => (
                <NavItem key={item.id} {...item} collapsed={collapsed} />
              ))}
            </div>
          )}
        </nav>

        {/* User + logout */}
        <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '10px 8px' : '10px' }}>
          {!collapsed && (
            <div style={{
              padding: '8px 10px 10px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(232,160,32,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--accent)',
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.2 }}>{user?.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'capitalize', letterSpacing: '0.04em' }}>{user?.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: collapsed ? '8px' : '7px 10px',
              color: 'var(--text3)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 7, fontFamily: 'inherit', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; }}
          >
            <span style={{ fontSize: 13 }}>↩</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'none', border: 'none',
            borderTop: '1px solid var(--border)',
            color: 'var(--text4)', cursor: 'pointer',
            padding: '8px', fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text3)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text4)')}
        >
          {collapsed ? '▸' : '◂'}
        </button>
      </aside>

      {/* ── Main content ── */}
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

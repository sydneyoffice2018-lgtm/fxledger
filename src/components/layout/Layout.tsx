import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useAuth } from '../../hooks/useAuth';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',   icon: '⬡',  path: '/' },
  { id: 'orders',       label: 'Orders',       icon: '📋', path: '/orders',       badge: 'core' },
  { id: 'customers',    label: 'Clients',      icon: '👤', path: '/customers' },
  { id: 'suppliers',    label: 'Suppliers',    icon: '🏢', path: '/suppliers' },
  { id: 'accounts',     label: 'Our Accounts', icon: '🏦', path: '/accounts' },
  { id: 'exchange',     label: 'Quick FX',     icon: '⇄',  path: '/exchange' },
  { id: 'transactions', label: 'Ledger',       icon: '📊', path: '/transactions' },
  { id: 'users',        label: 'Users',        icon: '🔑', path: '/users', adminOnly: true },
];

function NavItem({ item, collapsed }: { item: typeof NAV[0]; collapsed: boolean }) {
  const [active] = useRoute(item.path === '/' ? '/' : item.path + '{/:rest*}');
  const isActive = item.path === '/' ? window.location.pathname === '/' : active;

  return (
    <Link href={item.path}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
        cursor: 'pointer', marginBottom: 2, transition: 'all 0.15s',
        background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text2)',
        fontWeight: isActive ? 600 : 400,
      }}>
        <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{item.label}</span>
            {item.badge === 'core' && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', background: '#f59e0b20', padding: '1px 5px', borderRadius: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Main</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const visibleNav = NAV.filter(n => !n.adminOnly || user?.role === 'admin');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 210, flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, fontWeight: 800 }}>$</div>
          {!collapsed && <span style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>FX Ledger</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {!collapsed && (
            <>
              <div style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.1em', padding: '4px 6px 8px', textTransform: 'uppercase', fontWeight: 600 }}>Workflow</div>
              <NavItem item={NAV[0]} collapsed={false} />
              <NavItem item={NAV[1]} collapsed={false} />
              <div style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.1em', padding: '12px 6px 8px', textTransform: 'uppercase', fontWeight: 600 }}>Records</div>
              <NavItem item={NAV[2]} collapsed={false} />
              <NavItem item={NAV[3]} collapsed={false} />
              <NavItem item={NAV[4]} collapsed={false} />
              <div style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.1em', padding: '12px 6px 8px', textTransform: 'uppercase', fontWeight: 600 }}>Finance</div>
              <NavItem item={NAV[5]} collapsed={false} />
              <NavItem item={NAV[6]} collapsed={false} />
              {visibleNav.find(n => n.id === 'users') && (
                <>
                  <div style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.1em', padding: '12px 6px 8px', textTransform: 'uppercase', fontWeight: 600 }}>Admin</div>
                  <NavItem item={NAV[7]} collapsed={false} />
                </>
              )}
            </>
          )}
          {collapsed && visibleNav.map(n => <NavItem key={n.id} item={n} collapsed={true} />)}
        </nav>

        {/* User info */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 8px' }}>
          {!collapsed && (
            <div style={{ padding: '8px 10px', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          )}
          <button onClick={() => { logout(); window.location.href = '/login'; }}
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 7, padding: collapsed ? '8px' : '7px 10px', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6 }}>
            <span>↩</span>{!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '10px', fontSize: 14, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          {collapsed ? '▸' : '◂'}
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {children}
      </main>
    </div>
  );
}

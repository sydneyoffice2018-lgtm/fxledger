import { Link, useLocation } from 'wouter';
import { useAuth } from '../../hooks/useAuth';

const NAV_SECTIONS = [
  {
    label: 'Workflow',
    items: [
      { id: 'dashboard', label: 'Dashboard',    icon: '▦', path: '/' },
      { id: 'orders',    label: 'Orders',        icon: '⟳', path: '/orders', tag: 'MAIN' },
    ]
  },
  {
    label: 'Records',
    items: [
      { id: 'customers', label: 'Clients',       icon: '◎', path: '/customers' },
      { id: 'suppliers', label: 'Suppliers',     icon: '◈', path: '/suppliers' },
      { id: 'accounts',  label: 'Our Accounts',  icon: '⬡', path: '/accounts' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'exchange',     label: 'Quick FX',   icon: '⇄', path: '/exchange' },
      { id: 'transactions', label: 'Ledger',     icon: '≡', path: '/transactions' },
    ]
  },
];

const ADMIN_SECTION = {
  label: 'Admin',
  items: [{ id: 'users', label: 'Users', icon: '◉', path: '/users' }]
};

function NavItem({ item, isActive }: { item: { label: string; icon: string; path: string; tag?: string }; isActive: boolean }) {
  return (
    <Link href={item.path}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 9,
        cursor: 'pointer', marginBottom: 1, transition: 'all 0.12s',
        background: isActive ? 'var(--accent-lt)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text2)',
        fontWeight: isActive ? 600 : 400,
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}>
        <span style={{ fontSize: 13, flexShrink: 0, width: 18, textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
        <span style={{ fontSize: 13, flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
        {item.tag && (
          <span style={{ fontSize: 9, fontWeight: 800, color: '#b45309', background: '#fef3e2', padding: '1px 6px', borderRadius: 8, letterSpacing: '0.05em' }}>
            {item.tag}
          </span>
        )}
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => path === '/' ? location === '/' : location.startsWith(path);

  const allSections = user?.role === 'admin'
    ? [...NAV_SECTIONS, ADMIN_SECTION]
    : NAV_SECTIONS;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(15,22,35,0.04)',
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: 'var(--accent)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 8px rgba(26,47,85,0.3)',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '-0.02em',
            }}>FX</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>FX Ledger</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 500, letterSpacing: '0.04em' }}>REMITTANCE SYSTEM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {allSections.map(section => (
            <div key={section.label} style={{ marginBottom: 6 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: 'var(--text4)', textTransform: 'uppercase',
                padding: '8px 12px 5px',
              }}>
                {section.label}
              </div>
              {section.items.map(item => (
                <NavItem key={item.id} item={item} isActive={isActive(item.path)} />
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid var(--border)', padding: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', marginBottom: 6, borderRadius: 9,
            background: 'var(--surface2)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-lt)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'capitalize', fontWeight: 500 }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={() => { logout(); window.location.href = '/login'; }}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 12px', color: 'var(--text3)',
              cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; }}
          >
            <span>↩</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  );
}

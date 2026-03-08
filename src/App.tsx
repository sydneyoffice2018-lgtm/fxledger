import { Switch, Route, Redirect, useLocation } from 'wouter'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Layout } from './components/layout/Layout'
import { ToastProvider } from './components/ui'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { PaperPage } from './pages/Paper'
import { SuppliersPage } from './pages/Suppliers'
import { AccountsPage } from './pages/Accounts'
import { ExchangePage } from './pages/Exchange'
import { PayoutPage } from './pages/Payout'
import { CustomersPage } from './pages/Customers'
import { TransactionsPage, UsersPage } from './pages/Transactions'
import { OrdersPage } from './pages/Orders'

function AppRoutes() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text4)', fontSize: 12 }}>Loading…</div>
      </div>
    </div>
  );

  // Show login if not authenticated
  if (!user) return <LoginPage />;

  // Redirect /login to / when already logged in
  if (location === '/login') return <Redirect to="/" />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/paper" component={PaperPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/accounts" component={AccountsPage} />
        <Route path="/exchange" component={ExchangePage} />
        <Route path="/payout" component={PayoutPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/users">{user.role === 'admin' ? <UsersPage /> : <Redirect to="/" />}</Route>
        <Route><Redirect to="/" /></Route>
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}

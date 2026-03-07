import { Switch, Route, Redirect } from 'wouter'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Layout } from './components/layout/Layout'
import { ToastProvider } from './components/ui'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { CustomersPage } from './pages/Customers'
import { SuppliersPage } from './pages/Suppliers'
import { ExchangePage } from './pages/Exchange'
import { TransactionsPage, UsersPage } from './pages/Transactions'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text3)',fontSize:14 }}>Loading…</div>
  if (!user) return <LoginPage />

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/exchange" component={ExchangePage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/users">{user.role === 'admin' ? <UsersPage /> : <Redirect to="/" />}</Route>
        <Route><Redirect to="/" /></Route>
      </Switch>
    </Layout>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}

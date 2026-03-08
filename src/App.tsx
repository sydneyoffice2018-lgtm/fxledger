import { Switch, Route, Redirect } from 'wouter'
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

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, border:'2px solid var(--border2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 12px' }} />
        <div style={{ color:'var(--text4)', fontSize:12 }}>Loading…</div>
      </div>
    </div>
  )
  if (!user) return <LoginPage />

  return (
    <Layout>
      <Switch>
        {/* Dashboard */}
        <Route path="/" component={DashboardPage} />

        {/* The 5 money flow steps */}
        <Route path="/paper"     component={PaperPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/accounts"  component={AccountsPage} />
        <Route path="/exchange"  component={ExchangePage} />
        <Route path="/payout"    component={PayoutPage} />

        {/* Supporting */}
        <Route path="/customers"    component={CustomersPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/users">{user.role === 'admin' ? <UsersPage /> : <Redirect to="/" />}</Route>

        {/* Legacy redirects */}
        <Route path="/orders"><Redirect to="/paper" /></Route>
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

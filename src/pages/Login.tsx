import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Enter username and password'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, background: 'var(--accent)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, marginBottom: 14, color: '#0c0e12' }}>FX</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>FX Ledger</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text3)', fontSize: 13 }}>Currency Exchange Management</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'var(--text2)', fontSize: 11, marginBottom: 5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Username</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="admin" autoFocus autoComplete="username"
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 13px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text2)', fontSize: 11, marginBottom: 5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 13px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 7, padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '11px', color: '#0c0e12', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 12, marginTop: 16 }}>Default: admin / admin123</p>
      </div>
    </div>
  );
}

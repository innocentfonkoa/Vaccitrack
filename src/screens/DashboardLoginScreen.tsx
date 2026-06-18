import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../data/firebase'

interface Props {
  onLogin: () => void
}

export default function DashboardLoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      onLogin()
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        setError('Email or password is incorrect.')
      } else {
        setError('Could not sign in. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '40px 36px',
        width: 360,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
      }}>
        {/* Logo / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#1a6b3c', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16
          }}>V</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>VacciTrack</div>
            <div style={{ fontSize: 12, color: '#888' }}>Office Dashboard</div>
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>Sign in</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 28 }}>
          Use the credentials issued by your campaign coordinator.
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@health.gov.ng"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1.5px solid #ddd', fontSize: 14, marginBottom: 16,
            outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1.5px solid #ddd', fontSize: 14, marginBottom: 24,
            outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />

        {error && (
          <div style={{
            background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, color: '#c00', marginBottom: 16
          }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 8,
            background: loading ? '#aaa' : '#1a6b3c',
            color: '#fff', fontWeight: 700, fontSize: 15,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ fontSize: 12, color: '#aaa', marginTop: 20, textAlign: 'center' }}>
          Access restricted to authorised campaign staff only.
        </div>
      </div>
    </div>
  )
}

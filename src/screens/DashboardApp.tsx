// DashboardApp.tsx
// Drop this into your router/App.tsx at the /dashboard route.
// It handles auth state: shows login if signed out, dashboard if signed in.

import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../data/firebase'
import { getDashboardUser } from '../data/dashboardBackend'
import type { DashboardUser } from '../data/dashboardBackend'
import DashboardLoginScreen from './DashboardLoginScreen'
import DashboardScreen from './DashboardScreen'

export default function DashboardApp() {
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [profileError, setProfileError] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setChecking(false)
        return
      }
      try {
        const profile = await getDashboardUser(firebaseUser.uid)
        if (!profile) {
          // Signed in via Firebase Auth but no staff profile in Firestore
          setProfileError(true)
          setUser(null)
        } else {
          setUser(profile)
          setProfileError(false)
        }
      } catch (e) {
        console.error('Failed to load staff profile', e)
        setProfileError(true)
        setUser(null)
      } finally {
        setChecking(false)
      }
    })
    return unsub
  }, [])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f0f4f0',
        fontFamily: "'Inter', sans-serif", color: '#888', fontSize: 14
      }}>
        Loading…
      </div>
    )
  }

  if (profileError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f0f4f0',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#c00', marginBottom: 10 }}>Account not configured</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
            Your account was found but has no staff profile set up yet. Contact your campaign coordinator to complete your setup.
          </div>
          <button
            onClick={() => { setProfileError(false); auth.signOut() }}
            style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return <DashboardLoginScreen onLogin={() => {}} />
  }

  return <DashboardScreen user={user} />
}

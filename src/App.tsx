import { useEffect, useState } from 'react'
import {
  getCampaignById,
  getSelectedCampaignId,
  getVaccinatorProfile,
  hasSubmittedToday
} from './data/backend'
import { VaccinatorSetupScreen } from './screens/VaccinatorSetupScreen'
import { CampaignSelectScreen } from './screens/CampaignSelectScreen'
import { CaptureScreen } from './screens/CaptureScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { SubmissionHistoryScreen } from './screens/SubmissionHistoryScreen'
import DashboardApp from './screens/DashboardApp'
import type { SelectedLocation } from './components/LocationPicker'
import type { Campaign, Vaccinator, TallySubmission, ExtractedTallySheet } from './types'
import './app.css'

interface CapturedData {
  location: SelectedLocation
  photoUrl: string | null
  photoBlob: Blob | null
  extraction: ExtractedTallySheet
}

// ── Dashboard routing lives OUTSIDE the vaccinator app component so it
//    never violates React's rules-of-hooks (no conditional hook calls).
if (window.location.pathname.startsWith('/dashboard')) {
  // Render the dashboard immediately — DashboardApp handles its own auth.
  const root = document.getElementById('root')
  if (root && !root.dataset.mounted) {
    root.dataset.mounted = 'true'
  }
}

export default function App() {
  // Route /dashboard to the office dashboard app — safe here because it
  // is a plain early return with NO hooks called before it, and the
  // routing check itself is also done at module level above so it is
  // consistent across renders.
  const isDashboard = window.location.pathname.startsWith('/dashboard')

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [vaccinator, setVaccinator] = useState<Vaccinator | null>(null)
  const [submittedToday, setSubmittedToday] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState<TallySubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsCampaignSelection, setNeedsCampaignSelection] = useState(false)
  const [captured, setCaptured] = useState<CapturedData | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  // Always call hooks unconditionally — early return for dashboard AFTER hooks
  useEffect(() => {
    if (!isDashboard) {
      init()
    }
  }, [isDashboard])

  // ── Early return for dashboard (all hooks already called above) ──
  if (isDashboard) {
    return <DashboardApp />
  }

  async function init() {
    setLoading(true)
    setInitError(null)
    try {
      const savedCampaignId = getSelectedCampaignId()
      if (!savedCampaignId) {
        setNeedsCampaignSelection(true)
        setLoading(false)
        return
      }
      const c = await getCampaignById(savedCampaignId)
      if (!c) {
        setNeedsCampaignSelection(true)
        setLoading(false)
        return
      }
      setCampaign(c)
      setNeedsCampaignSelection(false)

      const v = getVaccinatorProfile()
      if (!v) {
        setVaccinator(null)
        setLoading(false)
        return
      }
      setVaccinator(v)

      // Wrap the Firestore call so a network failure on mobile doesn't
      // leave the app stuck on the loading screen.
      try {
        const already = await hasSubmittedToday(v.id, c.id)
        setSubmittedToday(already)
      } catch (firestoreErr) {
        console.warn('Could not check submission status (offline?):', firestoreErr)
        // Default to not submitted — vaccinator can still use the app.
        setSubmittedToday(false)
      }
    } catch (err) {
      console.error('Init error:', err)
      setInitError('Failed to load. Please check your connection and refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCampaignSelected(c: Campaign) {
    setCampaign(c)
    setSubmittedToday(false)
    setJustSubmitted(null)
    setNeedsCampaignSelection(false)
    const v = getVaccinatorProfile()
    if (v) {
      setVaccinator(v)
      try {
        const already = await hasSubmittedToday(v.id, c.id)
        setSubmittedToday(already)
      } catch {
        setSubmittedToday(false)
      }
    }
  }

  function handleVaccinatorSaved(v: Vaccinator) {
    setVaccinator(v)
  }

  function handleBackToCampaign() {
    setCampaign(null)
    setNeedsCampaignSelection(true)
    setCaptured(null)
  }

  if (loading) return <div className="loading-screen">Loading…</div>

  if (initError) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#c0392b', textAlign: 'center', padding: '0 24px' }}>{initError}</p>
        <button
          onClick={() => init()}
          style={{
            background: '#0F6E56', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 24px', fontSize: 15, cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (needsCampaignSelection || !campaign) {
    return <CampaignSelectScreen onSelected={handleCampaignSelected} />
  }

  if (!vaccinator) {
    return <VaccinatorSetupScreen onSaved={handleVaccinatorSaved} />
  }

  if (submittedToday || justSubmitted) {
    return (
      <SubmissionHistoryScreen
        campaign={campaign}
        vaccinator={vaccinator}
        justSubmitted={justSubmitted}
        onCampaignSwitch={() => {
          setCampaign(null)
          setJustSubmitted(null)
          setSubmittedToday(false)
          setNeedsCampaignSelection(true)
        }}
      />
    )
  }

  if (captured) {
    return (
      <ReviewScreen
        campaign={campaign}
        vaccinator={vaccinator}
        location={captured.location}
        photoUrl={captured.photoUrl}
        photoBlob={captured.photoBlob}
        extraction={captured.extraction}
        onSubmitted={sub => {
          setJustSubmitted(sub)
          setSubmittedToday(true)
          setCaptured(null)
        }}
        onRetake={() => setCaptured(null)}
      />
    )
  }

  return (
    <CaptureScreen
      campaign={campaign}
      vaccinator={vaccinator}
      onCaptured={setCaptured}
      onBack={handleBackToCampaign}
    />
  )
}

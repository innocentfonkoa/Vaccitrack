import { useEffect, useState } from 'react'
import {
  getCampaignById,
  getSelectedCampaignId,
  getVaccinatorProfile,
  getSubmissionsForVaccinator
} from './data/backend'
import { VaccinatorSetupScreen } from './screens/VaccinatorSetupScreen'
import { CampaignSelectScreen } from './screens/CampaignSelectScreen'
import { CaptureScreen } from './screens/CaptureScreen'
import { TallyEntryScreen } from './screens/TallyEntryScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { SubmissionHistoryScreen } from './screens/SubmissionHistoryScreen'
import DashboardApp from './screens/DashboardApp'
import type { SelectedLocation } from './components/LocationPicker'
import type { Campaign, Vaccinator, TallySubmission, ExtractedTallySheet } from './types'
import './app.css'

type AppStep = 'location' | 'tally-entry' | 'review' | 'submitted'

interface TallyData {
  photoBlob: Blob | null
  photoUrl: string | null
  extraction: ExtractedTallySheet
}

const isDashboard = window.location.pathname.startsWith('/dashboard')

export default function App() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [vaccinator, setVaccinator] = useState<Vaccinator | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsCampaignSelection, setNeedsCampaignSelection] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  const [step, setStep] = useState<AppStep>('location')
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [tallyData, setTallyData] = useState<TallyData | null>(null)
  const [justSubmitted, setJustSubmitted] = useState<TallySubmission | null>(null)
  const [submittedSettlements, setSubmittedSettlements] = useState<string[]>([])

  useEffect(() => {
    if (!isDashboard) init()
  }, [])

  if (isDashboard) return <DashboardApp />

  async function init() {
    setLoading(true)
    setInitError(null)
    try {
      const savedCampaignId = getSelectedCampaignId()
      if (!savedCampaignId) { setNeedsCampaignSelection(true); setLoading(false); return }
      const c = await getCampaignById(savedCampaignId)
      if (!c) { setNeedsCampaignSelection(true); setLoading(false); return }
      setCampaign(c)
      setNeedsCampaignSelection(false)
      const v = getVaccinatorProfile()
      if (!v) { setVaccinator(null); setLoading(false); return }
      setVaccinator(v)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const subs = await getSubmissionsForVaccinator(v.id, c.id)
        setSubmittedSettlements(subs.filter(s => s.submittedAt.slice(0, 10) === today).map(s => s.settlement))
      } catch { setSubmittedSettlements([]) }
    } catch (err) {
      console.error('Init error:', err)
      setInitError('Failed to load. Please check your connection and refresh.')
    } finally { setLoading(false) }
  }

  async function handleCampaignSelected(c: Campaign) {
    setCampaign(c)
    setNeedsCampaignSelection(false)
    setStep('location')
    const v = getVaccinatorProfile()
    if (v) {
      setVaccinator(v)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const subs = await getSubmissionsForVaccinator(v.id, c.id)
        setSubmittedSettlements(subs.filter(s => s.submittedAt.slice(0, 10) === today).map(s => s.settlement))
      } catch { setSubmittedSettlements([]) }
    }
  }

  function handleNewSettlement() {
    setStep('location')
    setLocation(null)
    setTallyData(null)
    setJustSubmitted(null)
  }

  if (loading) return <div className="loading-screen">Loading…</div>

  if (initError) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#c0392b', textAlign: 'center', padding: '0 24px' }}>{initError}</p>
        <button onClick={() => init()} style={{ background: '#0F6E56', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  if (needsCampaignSelection || !campaign) return <CampaignSelectScreen onSelected={handleCampaignSelected} />
  if (!vaccinator) return <VaccinatorSetupScreen onSaved={v => setVaccinator(v)} />

  if (step === 'submitted' && justSubmitted) {
    return (
      <SubmissionHistoryScreen
        campaign={campaign}
        vaccinator={vaccinator}
        justSubmitted={justSubmitted}
        onCampaignSwitch={() => { setCampaign(null); setNeedsCampaignSelection(true); setStep('location'); setJustSubmitted(null) }}
        onNewSettlement={handleNewSettlement}
      />
    )
  }

  if (step === 'review' && location && tallyData) {
    return (
      <ReviewScreen
        campaign={campaign}
        vaccinator={vaccinator}
        location={location}
        photoUrl={tallyData.photoUrl}
        photoBlob={tallyData.photoBlob}
        extraction={tallyData.extraction}
        onSubmitted={sub => {
          setJustSubmitted(sub)
          setSubmittedSettlements(prev => [...prev, sub.settlement])
          setStep('submitted')
        }}
        onBack={() => setStep('tally-entry')}
      />
    )
  }

  if (step === 'tally-entry' && location) {
    return (
      <TallyEntryScreen
        onNext={data => { setTallyData(data); setStep('review') }}
        onBack={() => setStep('location')}
      />
    )
  }

  return (
    <CaptureScreen
      campaign={campaign}
      vaccinator={vaccinator}
      submittedSettlements={submittedSettlements}
      onCaptured={loc => { setLocation(loc); setStep('tally-entry') }}
      onBack={() => { setCampaign(null); setNeedsCampaignSelection(true) }}
    />
  )
}

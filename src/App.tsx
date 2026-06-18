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

export default function App() {
  // Route /dashboard to the office dashboard app
  if (window.location.pathname.startsWith('/dashboard')) {
    return <DashboardApp />
  }

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [vaccinator, setVaccinator] = useState<Vaccinator | null>(null)
  const [submittedToday, setSubmittedToday] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState<TallySubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsCampaignSelection, setNeedsCampaignSelection] = useState(false)
  const [captured, setCaptured] = useState<CapturedData | null>(null)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)

    // Campaign selection comes first. getSelectedCampaignId() returns null
    // if the saved choice is from a previous day (Option A behavior).
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
      // Campaign chosen but no profile yet — VaccinatorSetupScreen handles this
      setVaccinator(null)
      setLoading(false)
      return
    }
    setVaccinator(v)

    const already = await hasSubmittedToday(v.id, c.id)
    setSubmittedToday(already)
    setLoading(false)
  }

  async function handleCampaignSelected(c: Campaign) {
    setCampaign(c)
    setSubmittedToday(false)
    setJustSubmitted(null)
    setNeedsCampaignSelection(false)

    const v = getVaccinatorProfile()
    if (v) {
      setVaccinator(v)
      const already = await hasSubmittedToday(v.id, c.id)
      setSubmittedToday(already)
    }
  }

  function handleVaccinatorSaved(v: Vaccinator) {
    setVaccinator(v)
  }

  if (loading) {
    return <div className="loading-screen">Loading…</div>
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

  // Screen 2 — only shown once a photo has been captured and read.
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

  // Screen 1 — location selection + snap.
  return (
    <CaptureScreen
      campaign={campaign}
      vaccinator={vaccinator}
      onCaptured={setCaptured}
    />
  )
}

import { useEffect, useState } from 'react'
import { getActiveCampaigns, setSelectedCampaignId } from '../data/backend'
import type { Campaign } from '../types'

interface Props {
  onSelected: (campaign: Campaign) => void
}

export function CampaignSelectScreen({ onSelected }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActiveCampaigns().then(c => {
      setCampaigns(c)
      setLoading(false)
    })
  }, [])

  function handlePick(campaign: Campaign) {
    setSelectedCampaignId(campaign.id)
    onSelected(campaign)
  }

  if (loading) {
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <div className="campaign-select-screen">
      <h1 className="campaign-select-title">Which campaign are you working on?</h1>
      <p className="campaign-select-sub">
        This is a one-time setup — VacciTrack will remember your choice until this
        campaign ends.
      </p>

      <div className="campaign-list">
        {campaigns.map(c => (
          <button
            key={c.id}
            className="campaign-option"
            onClick={() => handlePick(c)}
          >
            <span className="campaign-option-icon" aria-hidden="true">💉</span>
            <span className="campaign-option-text">
              <span className="campaign-option-name">{c.name}</span>
              <span className="campaign-option-meta">
                Reporting deadline: {formatTime(c.reportingDeadline)}
              </span>
            </span>
            <span className="campaign-option-arrow" aria-hidden="true">›</span>
          </button>
        ))}

        {campaigns.length === 0 && (
          <p className="empty-state">No active campaigns right now. Check back later.</p>
        )}
      </div>
    </div>
  )
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

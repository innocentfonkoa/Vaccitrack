import { useEffect, useState } from 'react'
import { getSubmissionsForVaccinator, switchCampaign } from '../data/backend'
import type { Campaign, Vaccinator, TallySubmission } from '../types'

interface Props {
  campaign: Campaign
  vaccinator: Vaccinator
  justSubmitted: TallySubmission | null
  onCampaignSwitch?: () => void
}

export function SubmissionHistoryScreen({ campaign, vaccinator, justSubmitted, onCampaignSwitch }: Props) {
  const [history, setHistory] = useState<TallySubmission[]>([])

  useEffect(() => {
    getSubmissionsForVaccinator(vaccinator.id, campaign.id).then(setHistory)
  }, [vaccinator.id, campaign.id, justSubmitted])

  const campaignTotal = history.reduce((sum, s) => {
    const total = s.resolvedTotal ?? s.extraction.totalVaccinatedToday ?? 0
    return sum + total
  }, 0)

  return (
    <div className="history-screen">
      <div className="campaign-tag">
        <span className="campaign-pill">{campaign.name}</span>
        <span className="vaccinator-tag">
          Team {vaccinator.teamCode} · {vaccinator.name}
        </span>
      </div>

      {justSubmitted && (
        <div className="success-banner">
          <div className="success-icon">✓</div>
          <div className="success-title">Submitted to office</div>
          <div className="success-sub">Synced just now · also saved on this phone</div>
        </div>
      )}

      <div className="done-banner">
        You're done for today. Each team submits one sheet per day — come back tomorrow
        to capture the next one.
      </div>

      <div className="card">
        <h2 className="card-title">My submissions — {campaign.name}</h2>
        {history.length === 0 && <p className="empty-state">No submissions yet this campaign.</p>}
        {history.map(sub => {
          const total = sub.resolvedTotal ?? sub.extraction.totalVaccinatedToday
          const dateLabel = new Date(sub.submittedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          })
          return (
            <div className="sub-row" key={sub.id}>
              <div>
                <div className="sub-row-title">
                  {dateLabel} · {sub.settlement}
                </div>
                <div className="sub-row-time">
                  Submitted {new Date(sub.submittedAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="sub-row-right">
                <div className="sub-row-total">{total ?? '—'}</div>
                <span className={`badge ${sub.status === 'resolved' ? 'b-amber' : 'b-green'}`}>
                  {sub.status === 'resolved' ? 'Reviewed' : 'Synced'}
                </span>
              </div>
            </div>
          )
        })}
        {history.length > 0 && (
          <div className="total-row">
            <span>Campaign total so far</span>
            <span className="total-value">{campaignTotal.toLocaleString()} children</span>
          </div>
        )}
      </div>

      {onCampaignSwitch && (
        <button
          className="switch-campaign-link"
          onClick={() => {
            switchCampaign()
            onCampaignSwitch()
          }}
        >
          Working on a different campaign? Switch here
        </button>
      )}
    </div>
  )
}

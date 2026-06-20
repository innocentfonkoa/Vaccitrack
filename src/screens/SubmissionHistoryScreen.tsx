import { useEffect, useState } from 'react'
import { getSubmissionsForVaccinator, switchCampaign } from '../data/backend'
import type { Campaign, Vaccinator, TallySubmission } from '../types'

interface Props {
  campaign: Campaign
  vaccinator: Vaccinator
  justSubmitted: TallySubmission | null
  onCampaignSwitch?: () => void
  onNewSettlement?: () => void
}

export function SubmissionHistoryScreen({
  campaign,
  vaccinator,
  justSubmitted,
  onCampaignSwitch,
  onNewSettlement
}: Props) {
  const [history, setHistory] = useState<TallySubmission[]>([])

  useEffect(() => {
    getSubmissionsForVaccinator(vaccinator.id, campaign.id).then(setHistory)
  }, [vaccinator.id, campaign.id, justSubmitted])

  const today = new Date().toISOString().slice(0, 10)
  const todaySubmissions = history.filter(s => s.submittedAt.slice(0, 10) === today)
  const todayTotal = todaySubmissions.reduce((sum, s) =>
    sum + (s.resolvedTotal ?? s.extraction.totalVaccinatedToday ?? 0), 0)

  const campaignTotal = history.reduce((sum, s) =>
    sum + (s.resolvedTotal ?? s.extraction.totalVaccinatedToday ?? 0), 0)

  return (
    <div className="history-screen">
      <div className="campaign-tag">
        <span className="campaign-pill">{campaign.name}</span>
        <span className="vaccinator-tag">
          Team {vaccinator.teamCode} · {vaccinator.name}
        </span>
      </div>

      {/* Success banner */}
      {justSubmitted && (
        <div className="success-banner">
          <div className="success-icon">✓</div>
          <div className="success-title">Submitted to office</div>
          <div className="success-sub">
            {justSubmitted.settlement} · {justSubmitted.extraction.totalVaccinatedToday ?? 0} children
          </div>
        </div>
      )}

      {/* Today's total */}
      {todaySubmissions.length > 0 && (
        <div style={{
          background: '#f0faf4', border: '1.5px solid #1a6b3c',
          borderRadius: 10, padding: '14px 16px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 12, color: '#1a6b3c', fontWeight: 600 }}>Today's total</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
              {todaySubmissions.length} settlement{todaySubmissions.length > 1 ? 's' : ''} submitted
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a6b3c' }}>
            {todayTotal}
          </div>
        </div>
      )}

      {/* New settlement button */}
      {onNewSettlement && (
        <button
          className="btn-primary"
          onClick={onNewSettlement}
          style={{ width: '100%', marginBottom: 16 }}
        >
          + Submit another settlement
        </button>
      )}

      {/* History */}
      <div className="card">
        <h2 className="card-title">My submissions — {campaign.name}</h2>
        {history.length === 0 && (
          <p className="empty-state">No submissions yet this campaign.</p>
        )}
        {history.map(sub => {
          const total = sub.resolvedTotal ?? sub.extraction.totalVaccinatedToday
          const dateLabel = new Date(sub.submittedAt).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric'
          })
          const isToday = sub.submittedAt.slice(0, 10) === today
          return (
            <div className="sub-row" key={sub.id}>
              <div>
                <div className="sub-row-title">
                  {dateLabel} · <strong>{sub.settlement}</strong>
                  {isToday && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, background: '#e8f5e9',
                      color: '#1a6b3c', borderRadius: 4, padding: '1px 5px',
                      fontWeight: 600
                    }}>Today</span>
                  )}
                </div>
                <div className="sub-row-time">
                  {sub.ward} · Submitted {new Date(sub.submittedAt).toLocaleTimeString(undefined, {
                    hour: 'numeric', minute: '2-digit'
                  })}
                </div>
                {sub.recorderName && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    Recorder: {sub.recorderName}
                  </div>
                )}
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
          onClick={() => { switchCampaign(); onCampaignSwitch() }}
        >
          Working on a different campaign? Switch here
        </button>
      )}
    </div>
  )
}

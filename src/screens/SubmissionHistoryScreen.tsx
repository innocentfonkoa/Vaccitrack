import { useEffect, useState } from 'react'
import { getSubmissionsForVaccinator, switchCampaign, saveVaccinatorProfile } from '../data/backend'
import type { Campaign, Vaccinator, TallySubmission } from '../types'

interface Props {
  campaign: Campaign
  vaccinator: Vaccinator
  justSubmitted: TallySubmission | null
  onCampaignSwitch?: () => void
  onNewSettlement?: () => void
  onProfileUpdated?: (v: Vaccinator) => void
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export function SubmissionHistoryScreen({
  campaign,
  vaccinator,
  justSubmitted,
  onCampaignSwitch,
  onNewSettlement,
  onProfileUpdated
}: Props) {
  const [history, setHistory] = useState<TallySubmission[]>([])
  const [editingProfile, setEditingProfile] = useState(false)
  const [name, setName] = useState(vaccinator.name)
  const [teamCode, setTeamCode] = useState(vaccinator.teamCode)
  const [phone, setPhone] = useState(vaccinator.phone ?? '')
  const [recorderName, setRecorderName] = useState(vaccinator.recorderName ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSubmissionsForVaccinator(vaccinator.id, campaign.id).then(setHistory)
  }, [vaccinator.id, campaign.id, justSubmitted])

  const today = new Date().toISOString().slice(0, 10)
  const todaySubmissions = history.filter(s => s.submittedAt.slice(0, 10) === today)
  const todayTotal = todaySubmissions.reduce((sum, s) =>
    sum + (s.resolvedTotal ?? s.extraction.totalVaccinatedToday ?? 0), 0)
  const campaignTotal = history.reduce((sum, s) =>
    sum + (s.resolvedTotal ?? s.extraction.totalVaccinatedToday ?? 0), 0)

  function handlePhoneChange(val: string) {
    setPhone(val.replace(/\D/g, '').slice(0, 11))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Enter your name'
    if (!teamCode.trim()) e.teamCode = 'Enter team code'
    if (!phone.trim()) e.phone = 'Enter phone number'
    else if (phone.length !== 11) e.phone = 'Must be exactly 11 digits'
    if (!recorderName.trim()) e.recorderName = 'Enter recorder name'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const updated: Vaccinator = {
      ...vaccinator,
      name: name.trim(),
      teamCode: teamCode.trim().toUpperCase(),
      phone: phone.trim(),
      recorderName: recorderName.trim()
    }
    saveVaccinatorProfile(updated)
    setSaved(true)
    setEditingProfile(false)
    onProfileUpdated?.(updated)
    setTimeout(() => setSaved(false), 3000)
  }

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

      {/* Profile saved confirmation */}
      {saved && (
        <div style={{
          background: '#f0faf4', border: '1.5px solid #1a6b3c',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          fontSize: 13, color: '#1a6b3c', fontWeight: 600
        }}>
          ✓ Profile updated successfully
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
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a6b3c' }}>{todayTotal}</div>
        </div>
      )}

      {/* New settlement button */}
      {onNewSettlement && (
        <button className="btn-primary" onClick={onNewSettlement} style={{ width: '100%', marginBottom: 12 }}>
          + Submit another settlement
        </button>
      )}

      {/* Edit profile section */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ margin: 0 }}>My profile</h2>
          {!editingProfile && (
            <button
              onClick={() => { setEditingProfile(true); setSaved(false) }}
              style={{
                background: 'none', border: '1px solid #1a6b3c', color: '#1a6b3c',
                borderRadius: 6, padding: '4px 12px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              Edit profile
            </button>
          )}
        </div>

        {!editingProfile ? (
          <div style={{ marginTop: 10 }}>
            {[
              { label: 'Name', value: vaccinator.name },
              { label: 'Team code', value: vaccinator.teamCode },
              { label: 'Phone', value: vaccinator.phone },
              { label: 'Recorder', value: vaccinator.recorderName },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13
              }}>
                <span style={{ color: '#888' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#333' }}>{value || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>
              Update your details below. Changes apply to future submissions only.
            </p>

            {/* Name */}
            <div className="field">
              <label htmlFor="edit-name">Vaccinator name</label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={e => setName(toTitleCase(e.target.value))}
                placeholder="e.g. Aisha Musa"
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            {/* Team code */}
            <div className="field">
              <label htmlFor="edit-team">Team code</label>
              <input
                id="edit-team"
                type="text"
                value={teamCode}
                onChange={e => setTeamCode(e.target.value)}
                placeholder="e.g. 043"
              />
              {errors.teamCode && <p className="field-error">{errors.teamCode}</p>}
            </div>

            {/* Phone */}
            <div className="field">
              <label htmlFor="edit-phone">Phone number</label>
              <input
                id="edit-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="e.g. 08012345678"
                maxLength={11}
              />
              <p style={{ fontSize: 12, color: phone.length === 11 ? '#1a6b3c' : '#888', marginTop: 4 }}>
                {phone.length}/11 digits {phone.length === 11 ? '✓' : ''}
              </p>
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>

            {/* Recorder name */}
            <div className="field">
              <label htmlFor="edit-recorder">Recorder name</label>
              <input
                id="edit-recorder"
                type="text"
                value={recorderName}
                onChange={e => setRecorderName(toTitleCase(e.target.value))}
                placeholder="e.g. Musa Ibrahim"
              />
              {errors.recorderName && <p className="field-error">{errors.recorderName}</p>}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditingProfile(false)
                  setName(vaccinator.name)
                  setTeamCode(vaccinator.teamCode)
                  setPhone(vaccinator.phone ?? '')
                  setRecorderName(vaccinator.recorderName ?? '')
                  setErrors({})
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} style={{ flex: 2 }}>
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submission history */}
      <div className="card">
        <h2 className="card-title">My submissions — {campaign.name}</h2>
        {history.length === 0 && <p className="empty-state">No submissions yet this campaign.</p>}
        {history.map(sub => {
          const total = sub.resolvedTotal ?? sub.extraction.totalVaccinatedToday
          const dateLabel = new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          const isToday = sub.submittedAt.slice(0, 10) === today
          return (
            <div className="sub-row" key={sub.id}>
              <div>
                <div className="sub-row-title">
                  {dateLabel} · <strong>{sub.settlement}</strong>
                  {isToday && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, background: '#e8f5e9',
                      color: '#1a6b3c', borderRadius: 4, padding: '1px 5px', fontWeight: 600
                    }}>Today</span>
                  )}
                </div>
                <div className="sub-row-time">
                  {sub.ward} · Submitted {new Date(sub.submittedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </div>
                {sub.recorderName && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Recorder: {sub.recorderName}</div>
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
        <button className="switch-campaign-link" onClick={() => { switchCampaign(); onCampaignSwitch() }}>
          Working on a different campaign? Switch here
        </button>
      )}
    </div>
  )
}

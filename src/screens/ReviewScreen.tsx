import { useState } from 'react'
import type { SelectedLocation } from '../components/LocationPicker'
import { submitTallySheet } from '../data/backend'
import type { Campaign, Vaccinator, ExtractedTallySheet, TallySubmission } from '../types'

interface Props {
  campaign: Campaign
  vaccinator: Vaccinator
  location: SelectedLocation
  photoUrl: string | null
  photoBlob: Blob | null
  extraction: ExtractedTallySheet
  onSubmitted: (submission: TallySubmission) => void
  onBack: () => void
}

const ROWS = [
  { key: 'zeroDose9to11'   as const, label: '9–11 months (zero dose)' },
  { key: 'zeroDose12to23'  as const, label: '12–23 months (zero dose)' },
  { key: 'otherDose9to11'  as const, label: '9–11 months (other dose)' },
  { key: 'otherDose12to23' as const, label: '12–23 months (other dose)' },
  { key: 'otherDose24to59' as const, label: '24–59 months (other dose)' },
]

export function ReviewScreen({
  campaign,
  vaccinator,
  location,
  photoUrl,
  photoBlob,
  extraction,
  onSubmitted,
  onBack,
}: Props) {
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const submission = await submitTallySheet(
        {
          campaignId: campaign.id,
          vaccinatorId: vaccinator.id,
          vaccinatorName: vaccinator.name,
          teamCode: vaccinator.teamCode,
          phone: vaccinator.phone ?? '',
          recorderName: vaccinator.recorderName ?? '',
          state: location.state,
          lga: location.lga,
          ward: location.ward,
          settlement: location.settlement,
          settlementIsCustom: location.settlementIsCustom,
          submittedAt: new Date().toISOString(),
          photoUrl,
          extraction,
          status: 'synced',
          resolvedTotal: null,
          resolvedBy: null,
          resolvedAt: null
        },
        photoBlob ?? undefined
      )
      onSubmitted(submission)
    } catch (err) {
      console.error('Submission failed:', err)
      setSubmitting(false)
      alert('Could not submit — please check your connection and try again.')
    }
  }

  const st = extraction.subTotals

  return (
    <div className="review-screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={onBack}
          disabled={submitting}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#1a6b3c', fontWeight: 600,
            padding: '2px 6px', borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>Step 3 of 3 — Review</span>
      </div>

      <div className="card">
        {/* Campaign + vaccinator info */}
        <div style={{
          background: '#f7faf8',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 14
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a6b3c' }}>
            {campaign.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
            Team {vaccinator.teamCode} · {vaccinator.name}
          </p>
          {vaccinator.phone && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
              📞 {vaccinator.phone}
            </p>
          )}
          {vaccinator.recorderName && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
              ✏️ Recorder: {vaccinator.recorderName}
            </p>
          )}
        </div>

        {/* Location */}
        <div style={{
          background: '#f7faf8',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 14
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Location</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#333' }}>
            {location.state} › {location.lga} › {location.ward} ›{' '}
            <strong>{location.settlement}</strong>
          </p>
        </div>

        {/* Photo preview */}
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Tally sheet"
            className="photo-preview"
            style={{ marginBottom: 14 }}
          />
        )}

        {/* Numbers table */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vaccination numbers
          </p>

          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 60px 60px',
            gap: 6,
            paddingBottom: 6,
            borderBottom: '1px solid #eee',
            marginBottom: 6
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>Age group</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1a6b3c', textAlign: 'center' }}>Male</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#c0392b', textAlign: 'center' }}>Female</span>
          </div>

          {ROWS.map(row => {
            const group = st[row.key]
            const m = group.male ?? 0
            const f = group.female ?? 0
            if (m === 0 && f === 0) return null
            return (
              <div key={row.key} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 60px',
                gap: 6,
                marginBottom: 6,
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 12, color: '#444' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1a6b3c', textAlign: 'center' }}>{m}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#c0392b', textAlign: 'center' }}>{f}</span>
              </div>
            )
          })}

          {/* Totals row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 60px 60px',
            gap: 6,
            paddingTop: 8,
            borderTop: '2px solid #1a6b3c',
            marginTop: 4
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3c' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6b3c', textAlign: 'center' }}>
              {extraction.totalRow.male ?? 0}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#c0392b', textAlign: 'center' }}>
              {extraction.totalRow.female ?? 0}
            </span>
          </div>
        </div>

        {/* Grand total */}
        <div style={{
          background: '#1a6b3c',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            Grand total (9–59 months)
          </span>
          <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>
            {extraction.totalVaccinatedToday ?? 0}
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn-secondary"
            onClick={onBack}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            ← Edit
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ flex: 2 }}
          >
            {submitting ? 'Submitting…' : 'Submit to office →'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  onRetake: () => void
}

// Screen 2: appears only after a photo has been captured and read. Shows
// the location/team context, the Male/Female breakdown, and the headline
// total — with manual entry fields when the AI couldn't confirm a total.
export function ReviewScreen({
  campaign,
  vaccinator,
  location,
  photoUrl,
  photoBlob,
  extraction,
  onSubmitted,
  onRetake
}: Props) {
  const [manualTotal, setManualTotal] = useState(extraction.totalVaccinatedToday?.toString() ?? '')
  const [manualMale, setManualMale] = useState(extraction.totalRow.male?.toString() ?? '')
  const [manualFemale, setManualFemale] = useState(extraction.totalRow.female?.toString() ?? '')
  const [submitting, setSubmitting] = useState(false)

  const isLowConfidence = extraction.confidence === 'low'

  function effectiveTotal(): number | null {
    if (isLowConfidence) {
      const parsed = Number(manualTotal)
      return manualTotal && !Number.isNaN(parsed) ? parsed : null
    }
    return extraction.totalVaccinatedToday
  }

  function effectiveMaleFemale(): { male: number | null; female: number | null } {
    if (isLowConfidence) {
      const male = manualMale ? Number(manualMale) : null
      const female = manualFemale ? Number(manualFemale) : null
      return {
        male: male !== null && !Number.isNaN(male) ? male : null,
        female: female !== null && !Number.isNaN(female) ? female : null
      }
    }
    return extraction.totalRow
  }

  async function handleConfirmSubmit() {
    const total = effectiveTotal()
    if (total === null) return
    const { male, female } = effectiveMaleFemale()

    setSubmitting(true)
    try {
      const submission = await submitTallySheet(
        {
          campaignId: campaign.id,
          vaccinatorId: vaccinator.id,
          teamCode: vaccinator.teamCode,
          state: location.state,
          lga: location.lga,
          ward: location.ward,
          settlement: location.settlement,
          settlementIsCustom: location.settlementIsCustom,
          submittedAt: new Date().toISOString(),
          photoUrl,
          extraction: {
            ...extraction,
            totalRow: { male, female },
            totalVaccinatedToday: total
          },
          status: isLowConfidence ? 'needs_review' : 'synced',
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

  return (
    <div className="review-screen">
      <div className="campaign-tag">
        <span className="campaign-pill">{campaign.name}</span>
        <span className="vaccinator-tag">
          Team {vaccinator.teamCode} · {vaccinator.name}
        </span>
      </div>

      <section className="step">
        <h2 className="step-title">
          <span className="step-num">3</span> Review and submit
        </h2>
        <div className="card">
          {photoUrl && <img src={photoUrl} alt="Captured tally sheet" className="photo-preview" />}
          <p className="location-breadcrumb">
            {location.state} &gt; {location.lga} &gt; {location.ward} &gt;{' '}
            <strong>{location.settlement}</strong>
          </p>

          {!isLowConfidence ? (
            <>
              <div className="breakdown-row">
                <div className="breakdown-item">
                  <div className="breakdown-value">{extraction.totalRow.male ?? '—'}</div>
                  <div className="breakdown-label">Male</div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-value">{extraction.totalRow.female ?? '—'}</div>
                  <div className="breakdown-label">Female</div>
                </div>
              </div>
              <div className="result-hero">
                <div className="result-num">{extraction.totalVaccinatedToday}</div>
                <div className="result-label">children vaccinated today</div>
              </div>
            </>
          ) : (
            <div className="needs-review-box">
              <p className="needs-review-title">⚠ Could not confirm the total automatically</p>
              <p className="needs-review-detail">
                The grand total and total row didn't agree on this sheet. Please check the
                photo and enter the correct numbers.
              </p>
              <div className="manual-mf-row">
                <div className="field-half">
                  <label htmlFor="manual-male">Male</label>
                  <input
                    id="manual-male"
                    type="number"
                    value={manualMale}
                    onChange={e => setManualMale(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="field-half">
                  <label htmlFor="manual-female">Female</label>
                  <input
                    id="manual-female"
                    type="number"
                    value={manualFemale}
                    onChange={e => setManualFemale(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <label htmlFor="manual-total">Total vaccinated today</label>
              <input
                id="manual-total"
                type="number"
                value={manualTotal}
                onChange={e => setManualTotal(e.target.value)}
                placeholder="Enter total"
              />
            </div>
          )}

          <button
            className="btn-primary"
            disabled={effectiveTotal() === null || submitting}
            onClick={handleConfirmSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit to office'}
          </button>
          <button className="btn-secondary" onClick={onRetake} disabled={submitting}>
            Retake photo
          </button>
        </div>
      </section>
    </div>
  )
}

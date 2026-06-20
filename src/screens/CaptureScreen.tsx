import { useState } from 'react'
import { LocationPicker, type SelectedLocation } from '../components/LocationPicker'
import type { Campaign, Vaccinator } from '../types'

interface Props {
  campaign: Campaign
  vaccinator: Vaccinator
  submittedSettlements: string[]
  onCaptured: (location: SelectedLocation) => void
  onBack: () => void
}

export function CaptureScreen({ campaign, vaccinator, submittedSettlements, onCaptured, onBack }: Props) {
  const [location, setLocation] = useState<SelectedLocation | null>(null)

  const isDuplicate = location !== null && submittedSettlements.includes(location.settlement)
  const canProceed = location !== null && !isDuplicate

  function handleNext() {
    if (!canProceed || !location) return
    onCaptured(location)
  }

  return (
    <div className="capture-screen">
      {/* Header */}
      <div className="campaign-tag">
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#1a6b3c', fontWeight: 600,
            padding: '2px 6px', marginRight: 6, borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}
          aria-label="Switch campaign"
        >
          ← Back
        </button>
        <span className="campaign-pill">{campaign.name}</span>
        <span className="vaccinator-tag">
          Team {vaccinator.teamCode} · {vaccinator.name}
        </span>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 0 4px',
        alignItems: 'center', fontSize: 12, color: '#888'
      }}>
        <span style={{
          background: '#1a6b3c', color: '#fff',
          borderRadius: '50%', width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0
        }}>1</span>
        <span style={{ color: '#1a6b3c', fontWeight: 600 }}>Select location</span>
        <span style={{ margin: '0 4px' }}>›</span>
        <span style={{ opacity: 0.5 }}>2 Enter numbers</span>
        <span style={{ margin: '0 4px', opacity: 0.5 }}>›</span>
        <span style={{ opacity: 0.5 }}>3 Review</span>
      </div>

      {/* Already submitted notice */}
      {submittedSettlements.length > 0 && (
        <div style={{
          background: '#fff8e1', border: '1px solid #ffe082',
          borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13
        }}>
          <strong>Already submitted today:</strong>{' '}
          {submittedSettlements.join(', ')}
        </div>
      )}

      <section className="step">
        <h2 className="step-title">
          <span className="step-num">1</span> Confirm location for today
        </h2>
        <div className="card">
          <LocationPicker onComplete={setLocation} />
        </div>
      </section>

      {/* Duplicate warning */}
      {isDuplicate && (
        <div style={{
          background: '#fff0f0', border: '1px solid #ffcdd2',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          fontSize: 13, color: '#c0392b'
        }}>
          ⚠ You have already submitted a tally sheet for <strong>{location?.settlement}</strong> today.
          Please select a different settlement.
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 12, padding: '8px 0 32px' }}>
        <button
          className="btn-secondary"
          onClick={onBack}
          style={{ flex: 1 }}
        >
          ← Back
        </button>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={!canProceed}
          style={{ flex: 2, opacity: canProceed ? 1 : 0.5 }}
        >
          Next → Enter numbers
        </button>
      </div>
    </div>
  )
}

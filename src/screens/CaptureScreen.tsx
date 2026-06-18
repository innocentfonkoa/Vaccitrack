import { useRef, useState } from 'react'
import { LocationPicker, type SelectedLocation } from '../components/LocationPicker'
import { extractTallySheet } from '../data/aiExtraction'
import type { Campaign, Vaccinator, ExtractedTallySheet } from '../types'

interface Props {
  campaign: Campaign
  vaccinator: Vaccinator
  onCaptured: (data: {
    location: SelectedLocation
    photoUrl: string | null
    photoBlob: Blob | null
    extraction: ExtractedTallySheet
  }) => void
}

// Screen 1: location selection + snapping the photo only.
// Once the AI extraction finishes, control hands off to ReviewScreen
// (a separate screen, per the user's request) via onCaptured.
export function CaptureScreen({ campaign, vaccinator, onCaptured }: Props) {
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const locationReady = location !== null

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !location) return
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    setExtracting(true)
    runExtraction(file, url, location)
  }

  async function runExtraction(file: Blob, url: string, loc: SelectedLocation) {
    const result = await extractTallySheet(file)
    onCaptured({ location: loc, photoUrl: url, photoBlob: file, extraction: result })
  }

  return (
    <div className="capture-screen">
      <div className="campaign-tag">
        <span className="campaign-pill">{campaign.name}</span>
        <span className="vaccinator-tag">
          Team {vaccinator.teamCode} · {vaccinator.name}
        </span>
      </div>

      <section className="step">
        <h2 className="step-title">
          <span className="step-num">1</span> Confirm location for today
        </h2>
        <div className="card">
          <LocationPicker onComplete={setLocation} />
        </div>
      </section>

      <section className="step">
        <h2 className="step-title">
          <span className="step-num">2</span> Snap the tally sheet
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          style={{ display: 'none' }}
        />
        <button
          className={`snap-btn ${locationReady ? 'enabled' : ''}`}
          disabled={!locationReady || extracting}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="snap-icon" aria-hidden="true">📷</span>
          <span>{extracting ? 'Reading totals…' : 'Take photo'}</span>
        </button>
        {!locationReady && (
          <p className="lock-note">Select all fields above to unlock the camera</p>
        )}
      </section>

      {extracting && (
        <section className="step">
          <div className="card extracting-card">
            {photoUrl && <img src={photoUrl} alt="Captured tally sheet" className="photo-preview" />}
            <p className="extracting-text">Reading totals row…</p>
          </div>
        </section>
      )}
    </div>
  )
}

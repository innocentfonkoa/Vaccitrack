import { useState, useRef } from 'react'
import type { ExtractedTallySheet } from '../types'

interface AgeGroupEntry {
  male: string
  female: string
}

interface TallyData {
  zeroDose9to11: AgeGroupEntry
  zeroDose12to23: AgeGroupEntry
  otherDose9to11: AgeGroupEntry
  otherDose12to23: AgeGroupEntry
  otherDose24to59: AgeGroupEntry
}

interface Props {
  onNext: (data: { photoBlob: Blob | null; photoUrl: string | null; extraction: ExtractedTallySheet }) => void
  onBack: () => void
}

const EMPTY_ENTRY = (): AgeGroupEntry => ({ male: '', female: '' })

const ROWS: { key: keyof TallyData; label: string }[] = [
  { key: 'zeroDose9to11',   label: '9–11 months (zero dose)' },
  { key: 'zeroDose12to23',  label: '12–23 months (zero dose)' },
  { key: 'otherDose9to11',  label: '9–11 months (other dose)' },
  { key: 'otherDose12to23', label: '12–23 months (other dose)' },
  { key: 'otherDose24to59', label: '24–59 months (other dose)' },
]

export function TallyEntryScreen({ onNext, onBack }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [tally, setTally] = useState<TallyData>({
    zeroDose9to11:   EMPTY_ENTRY(),
    zeroDose12to23:  EMPTY_ENTRY(),
    otherDose9to11:  EMPTY_ENTRY(),
    otherDose12to23: EMPTY_ENTRY(),
    otherDose24to59: EMPTY_ENTRY(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function parseNum(val: string): number {
    const n = parseInt(val, 10)
    return isNaN(n) || n < 0 ? 0 : n
  }

  function totalMale(): number {
    return ROWS.reduce((s, r) => s + parseNum(tally[r.key].male), 0)
  }

  function totalFemale(): number {
    return ROWS.reduce((s, r) => s + parseNum(tally[r.key].female), 0)
  }

  function grandTotal(): number {
    return totalMale() + totalFemale()
  }

  function updateTally(key: keyof TallyData, gender: 'male' | 'female', val: string) {
    const digits = val.replace(/\D/g, '')
    setTally(prev => ({
      ...prev,
      [key]: { ...prev[key], [gender]: digits }
    }))
    // Clear error for this field
    setErrors(prev => {
      const next = { ...prev }
      delete next[`${key}-${gender}`]
      return next
    })
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    setPhotoBlob(file)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    let hasAnyData = false
    for (const row of ROWS) {
      const m = tally[row.key].male
      const f = tally[row.key].female
      if (m !== '' || f !== '') hasAnyData = true
      if (m !== '' && f === '') e[`${row.key}-female`] = 'Enter female count'
      if (f !== '' && m === '') e[`${row.key}-male`] = 'Enter male count'
    }
    if (!hasAnyData) {
      e['general'] = 'Enter at least one row of data'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return

    const st = tally
    const extraction: ExtractedTallySheet = {
      dateOnSheet: new Date().toISOString().slice(0, 10),
      subTotals: {
        zeroDose9to11:   { male: parseNum(st.zeroDose9to11.male),   female: parseNum(st.zeroDose9to11.female) },
        zeroDose12to23:  { male: parseNum(st.zeroDose12to23.male),  female: parseNum(st.zeroDose12to23.female) },
        otherDose9to11:  { male: parseNum(st.otherDose9to11.male),  female: parseNum(st.otherDose9to11.female) },
        otherDose12to23: { male: parseNum(st.otherDose12to23.male), female: parseNum(st.otherDose12to23.female) },
        otherDose24to59: { male: parseNum(st.otherDose24to59.male), female: parseNum(st.otherDose24to59.female) },
      },
      totalRow: { male: totalMale(), female: totalFemale() },
      grandTotal9to59: grandTotal(),
      totalVaccinatedToday: grandTotal(),
      confidence: 'high',
      lowConfidenceFields: []
    }

    onNext({ photoBlob, photoUrl, extraction })
  }

  const allRowsEmpty = ROWS.every(r => tally[r.key].male === '' && tally[r.key].female === '')

  return (
    <div className="capture-screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#1a6b3c', fontWeight: 600,
            padding: '2px 6px', borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>Step 2 of 3</span>
      </div>

      {/* Photo section */}
      <section className="step">
        <h2 className="step-title">
          <span className="step-num">1</span> Snap tally sheet (optional)
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
          className="snap-btn enabled"
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: 8 }}
        >
          <span className="snap-icon" aria-hidden="true">📷</span>
          <span>{photoUrl ? 'Retake photo' : 'Take photo'}</span>
        </button>
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Tally sheet"
            className="photo-preview"
            style={{ marginTop: 8 }}
          />
        )}
      </section>

      {/* Number entry section */}
      <section className="step">
        <h2 className="step-title">
          <span className="step-num">2</span> Enter vaccination numbers
        </h2>
        <div className="card" style={{ padding: '12px 16px' }}>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px',
            gap: 8,
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: '1px solid #eee'
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Age group</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a6b3c', textAlign: 'center' }}>Male</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#c0392b', textAlign: 'center' }}>Female</span>
          </div>

          {/* Rows */}
          {ROWS.map(row => (
            <div key={row.key} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px',
              gap: 8,
              marginBottom: 10,
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: '#333', lineHeight: 1.3 }}>{row.label}</span>
              <div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={tally[row.key].male}
                  onChange={e => updateTally(row.key, 'male', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 6px',
                    border: errors[`${row.key}-male`] ? '1.5px solid #c0392b' : '1.5px solid #ddd',
                    borderRadius: 8,
                    fontSize: 16,
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />
                {errors[`${row.key}-male`] && (
                  <p style={{ fontSize: 11, color: '#c0392b', margin: '2px 0 0' }}>
                    {errors[`${row.key}-male`]}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={tally[row.key].female}
                  onChange={e => updateTally(row.key, 'female', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 6px',
                    border: errors[`${row.key}-female`] ? '1.5px solid #c0392b' : '1.5px solid #ddd',
                    borderRadius: 8,
                    fontSize: 16,
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />
                {errors[`${row.key}-female`] && (
                  <p style={{ fontSize: 11, color: '#c0392b', margin: '2px 0 0' }}>
                    {errors[`${row.key}-female`]}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Totals */}
          <div style={{
            borderTop: '2px solid #1a6b3c',
            marginTop: 8,
            paddingTop: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px',
            gap: 8,
            alignItems: 'center'
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3c' }}>Total</span>
            <div style={{
              background: '#f0faf4',
              border: '1.5px solid #1a6b3c',
              borderRadius: 8,
              padding: '8px 6px',
              textAlign: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#1a6b3c'
            }}>
              {allRowsEmpty ? '—' : totalMale()}
            </div>
            <div style={{
              background: '#fff5f5',
              border: '1.5px solid #c0392b',
              borderRadius: 8,
              padding: '8px 6px',
              textAlign: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#c0392b'
            }}>
              {allRowsEmpty ? '—' : totalFemale()}
            </div>
          </div>

          {/* Grand total */}
          <div style={{
            marginTop: 12,
            background: '#1a6b3c',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
              Grand total (9–59 months)
            </span>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>
              {allRowsEmpty ? '—' : grandTotal()}
            </span>
          </div>

          {errors.general && (
            <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
              {errors.general}
            </p>
          )}
        </div>
      </section>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, padding: '0 0 32px' }}>
        <button className="btn-secondary" onClick={onBack} style={{ flex: 1 }}>
          ← Back
        </button>
        <button className="btn-primary" onClick={handleNext} style={{ flex: 2 }}>
          Next → Review
        </button>
      </div>
    </div>
  )
}

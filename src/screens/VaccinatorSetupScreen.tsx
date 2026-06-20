import { useState } from 'react'
import { saveVaccinatorProfile } from '../data/backend'
import type { Vaccinator } from '../types'

interface Props {
  onSaved: (vaccinator: Vaccinator) => void
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export function VaccinatorSetupScreen({ onSaved }: Props) {
  const [name, setName] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [phone, setPhone] = useState('')
  const [recorderName, setRecorderName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Enter your name'
    if (!teamCode.trim()) e.teamCode = 'Enter your team code'
    if (!phone.trim()) e.phone = 'Enter your phone number'
    else if (!/^\d+$/.test(phone)) e.phone = 'Phone number must contain digits only'
    else if (phone.length !== 11) e.phone = 'Phone number must be exactly 11 digits'
    if (!recorderName.trim()) e.recorderName = 'Enter recorder name'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handlePhoneChange(val: string) {
    // Strip non-digits and cap at 11
    const digits = val.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
  }

  function handleContinue() {
    if (!validate()) return
    const vaccinator: Vaccinator = {
      id: `vacc-${Date.now()}`,
      name: name.trim(),
      teamCode: teamCode.trim().toUpperCase(),
      phone: phone.trim(),
      recorderName: recorderName.trim()
    }
    saveVaccinatorProfile(vaccinator)
    onSaved(vaccinator)
  }

  return (
    <div className="vaccinator-setup-screen">
      <h1 className="campaign-select-title">Welcome to VacciTrack</h1>
      <p className="campaign-select-sub">
        This is a one-time setup — your details will be remembered on this phone.
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="vacc-name">Vaccinator name</label>
          <input
            id="vacc-name"
            type="text"
            placeholder="e.g. Aisha Musa"
            value={name}
            onChange={e => setName(toTitleCase(e.target.value))}
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="vacc-team-code">Team code</label>
          <input
            id="vacc-team-code"
            type="text"
            placeholder="e.g. 043"
            value={teamCode}
            onChange={e => setTeamCode(e.target.value)}
          />
          {errors.teamCode && <p className="field-error">{errors.teamCode}</p>}
        </div>

        <div className="field">
          <label htmlFor="vacc-phone">Phone number</label>
          <input
            id="vacc-phone"
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={e => handlePhoneChange(e.target.value)}
            maxLength={11}
          />
          <p className="field-hint" style={{
            fontSize: 12,
            color: phone.length === 11 ? '#1a6b3c' : '#888',
            marginTop: 4
          }}>
            {phone.length}/11 digits {phone.length === 11 ? '✓' : ''}
          </p>
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>

        <div className="field">
          <label htmlFor="vacc-recorder">Recorder name</label>
          <input
            id="vacc-recorder"
            type="text"
            placeholder="e.g. Musa Ibrahim"
            value={recorderName}
            onChange={e => setRecorderName(toTitleCase(e.target.value))}
          />
          {errors.recorderName && <p className="field-error">{errors.recorderName}</p>}
        </div>

        <button className="btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}

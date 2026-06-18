import { useState } from 'react'
import { saveVaccinatorProfile } from '../data/backend'
import type { Vaccinator } from '../types'

interface Props {
  onSaved: (vaccinator: Vaccinator) => void
}

export function VaccinatorSetupScreen({ onSaved }: Props) {
  const [name, setName] = useState('')
  const [teamCode, setTeamCode] = useState('')

  const canContinue = name.trim().length > 0 && teamCode.trim().length > 0

  function handleContinue() {
    if (!canContinue) return
    const vaccinator: Vaccinator = {
      id: `vacc-${Date.now()}`,
      name: name.trim(),
      teamCode: teamCode.trim()
    }
    saveVaccinatorProfile(vaccinator)
    onSaved(vaccinator)
  }

  return (
    <div className="vaccinator-setup-screen">
      <h1 className="campaign-select-title">Welcome to VacciTrack</h1>
      <p className="campaign-select-sub">
        This is a one-time setup — your name and team code will be remembered on this
        phone.
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="vacc-name">Your name</label>
          <input
            id="vacc-name"
            type="text"
            placeholder="e.g. Aisha Musa"
            value={name}
            onChange={e => setName(e.target.value)}
          />
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
        </div>

        <button className="btn-primary" disabled={!canContinue} onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import locationData from '../data/locationHierarchy.json'
import type { LocationHierarchy } from '../types'

const HIERARCHY = locationData as LocationHierarchy

export interface SelectedLocation {
  state: string
  lga: string
  ward: string
  settlement: string
  settlementIsCustom: boolean
}

interface Props {
  onComplete: (location: SelectedLocation | null) => void
}

export function LocationPicker({ onComplete }: Props) {
  const [state, setState] = useState('')
  const [lga, setLga] = useState('')
  const [ward, setWard] = useState('')
  const [settlement, setSettlement] = useState('')
  const [customSettlement, setCustomSettlement] = useState('')

  const states = useMemo(() => Object.keys(HIERARCHY).sort(), [])
  const lgas = useMemo(() => (state ? Object.keys(HIERARCHY[state]).sort() : []), [state])
  const wards = useMemo(() => (state && lga ? Object.keys(HIERARCHY[state][lga]).sort() : []), [state, lga])
  const settlements = useMemo(
    () => (state && lga && ward ? HIERARCHY[state][lga][ward] : []),
    [state, lga, ward]
  )

  const isOther = settlement === '__other__'
  const settlementValue = isOther ? customSettlement.trim() : settlement
  const isComplete = Boolean(state && lga && ward && settlementValue)

  function emit() {
    if (!isComplete) {
      onComplete(null)
      return
    }
    onComplete({
      state,
      lga,
      ward,
      settlement: settlementValue,
      settlementIsCustom: isOther
    })
  }

  function handleStateChange(value: string) {
    setState(value)
    setLga('')
    setWard('')
    setSettlement('')
    setCustomSettlement('')
    onComplete(null)
  }

  function handleLgaChange(value: string) {
    setLga(value)
    setWard('')
    setSettlement('')
    setCustomSettlement('')
    onComplete(null)
  }

  function handleWardChange(value: string) {
    setWard(value)
    setSettlement('')
    setCustomSettlement('')
    onComplete(null)
  }

  function handleSettlementChange(value: string) {
    setSettlement(value)
    if (value !== '__other__') {
      setCustomSettlement('')
    }
    setTimeout(emit, 0)
  }

  function handleCustomSettlementChange(value: string) {
    setCustomSettlement(value)
    setTimeout(emit, 0)
  }

  return (
    <div className="location-picker">
      <div className="field">
        <label htmlFor="loc-state">State</label>
        <select id="loc-state" value={state} onChange={e => handleStateChange(e.target.value)}>
          <option value="">Select state</option>
          {states.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="loc-lga">LGA</label>
        <select
          id="loc-lga"
          value={lga}
          onChange={e => handleLgaChange(e.target.value)}
          disabled={!state}
        >
          <option value="">Select LGA</option>
          {lgas.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="loc-ward">Ward</label>
        <select
          id="loc-ward"
          value={ward}
          onChange={e => handleWardChange(e.target.value)}
          disabled={!lga}
        >
          <option value="">Select ward</option>
          {wards.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="loc-settlement">Settlement</label>
        <select
          id="loc-settlement"
          value={settlement}
          onChange={e => handleSettlementChange(e.target.value)}
          disabled={!ward}
        >
          <option value="">Select settlement</option>
          {settlements.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="__other__">Other (not on list)</option>
        </select>
        {ward && (
          <p className="field-hint">{settlements.length} settlements on record for this ward</p>
        )}

        {isOther && (
          <input
            type="text"
            placeholder="Type settlement name"
            value={customSettlement}
            onChange={e => handleCustomSettlementChange(e.target.value)}
            aria-label="Custom settlement name"
            className="custom-settlement-input"
          />
        )}
      </div>
    </div>
  )
}

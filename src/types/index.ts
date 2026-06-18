// Core data types for VacciTrack.
// These mirror the Core v1.1 extraction schema from the planning doc and
// are written so they map 1:1 onto Firestore documents later — each type
// here becomes a collection/document shape, no restructuring needed.

export interface LocationHierarchy {
  // state -> lga -> ward -> settlement[]
  [state: string]: {
    [lga: string]: {
      [ward: string]: string[]
    }
  }
}

export interface Campaign {
  id: string
  name: string // e.g. "2024 Measles Campaign"
  active: boolean
  reportingDeadline: string // "16:00" - 4:00 PM, 24h format
}

export interface Vaccinator {
  id: string
  name: string
  teamCode: string
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface AgeGroupTotals {
  male: number | null
  female: number | null
}

export interface ExtractedTallySheet {
  // What the AI reads from the photo (Core v1.1 — totals only, no location,
  // since location is selected by the vaccinator before the photo is taken)
  dateOnSheet: string | null
  subTotals: {
    zeroDose9to11: AgeGroupTotals
    zeroDose12to23: AgeGroupTotals
    otherDose9to11: AgeGroupTotals
    otherDose12to23: AgeGroupTotals
    otherDose24to59: AgeGroupTotals
  }
  totalRow: AgeGroupTotals
  grandTotal9to59: number | null
  totalVaccinatedToday: number | null
  confidence: ConfidenceLevel
  lowConfidenceFields: string[]
}

export interface TallySubmission {
  id: string
  campaignId: string
  vaccinatorId: string
  teamCode: string
  state: string
  lga: string
  ward: string
  settlement: string
  settlementIsCustom: boolean // true if vaccinator typed "Other"
  submittedAt: string // ISO timestamp
  photoUrl: string | null // local blob URL until synced, then storage URL
  extraction: ExtractedTallySheet
  status: 'pending_sync' | 'synced' | 'needs_review' | 'resolved'
  resolvedTotal: number | null // set by office staff if corrected
  resolvedBy: string | null
  resolvedAt: string | null
}

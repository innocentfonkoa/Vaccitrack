// Core data types for VacciTrack.

export interface LocationHierarchy {
  [state: string]: {
    [lga: string]: {
      [ward: string]: string[]
    }
  }
}

export interface Campaign {
  id: string
  name: string
  active: boolean
  reportingDeadline: string
}

export interface Vaccinator {
  id: string
  name: string
  teamCode: string
  phone: string
  recorderName: string
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface AgeGroupTotals {
  male: number | null
  female: number | null
}

export interface ExtractedTallySheet {
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
  vaccinatorName: string
  teamCode: string
  phone: string
  recorderName: string
  state: string
  lga: string
  ward: string
  settlement: string
  settlementIsCustom: boolean
  submittedAt: string
  photoUrl: string | null
  extraction: ExtractedTallySheet
  status: 'pending_sync' | 'synced' | 'needs_review' | 'resolved'
  resolvedTotal: number | null
  resolvedBy: string | null
  resolvedAt: string | null
}

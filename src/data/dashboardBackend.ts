// Dashboard-specific backend functions.
// Reads from the same 'submissions' Firestore collection as the vaccinator
// app, but adds role-based filtering (LGA staff see only their LGA,
// state staff see all LGAs in their state).

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { doc, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import type { TallySubmission } from '../types'

export type DashboardRole = 'lga_staff' | 'state_staff'

export interface DashboardUser {
  uid: string
  email: string
  role: DashboardRole
  state: string
  lga?: string
  displayName: string
}

export async function getDashboardUser(uid: string): Promise<DashboardUser | null> {
  const snap = await getDoc(doc(db, 'staff', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as DashboardUser
}

export async function dashboardSignOut(): Promise<void> {
  await signOut(auth)
}

// Fetch all submissions visible to this user (unfiltered by date/ward —
// we filter those client-side so the date picker works without re-fetching).
export async function getSubmissionsForDashboard(
  user: DashboardUser,
  campaignId: string
): Promise<TallySubmission[]> {
  let q

  if (user.role === 'lga_staff' && user.lga) {
    q = query(
      collection(db, 'submissions'),
      where('campaignId', '==', campaignId),
      where('lga', '==', user.lga),
      orderBy('submittedAt', 'desc')
    )
  } else {
    q = query(
      collection(db, 'submissions'),
      where('campaignId', '==', campaignId),
      where('state', '==', user.state),
      orderBy('submittedAt', 'desc')
    )
  }

  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TallySubmission))
}

export interface DashboardStats {
  vaccinatedToday: number
  sheetsSubmitted: number
  flaggedForReview: number
  byLGA: Record<string, number>
  byWard: Record<string, number>
  bySettlement: Record<string, number>
  ageBreakdown: {
    zeroDose9to11: number
    zeroDose12to23: number
    otherDose9to11: number
    otherDose12to23: number
    otherDose24to59: number
  }
}

export function computeDashboardStats(submissions: TallySubmission[]): DashboardStats {
  const flagged = submissions.filter(s =>
    s.extraction?.confidence === 'low' ||
    (s.extraction?.lowConfidenceFields && s.extraction.lowConfidenceFields.length > 0)
  )

  const vaccinatedToday = submissions.reduce((sum, s) =>
    sum + (s.extraction?.totalVaccinatedToday ?? 0), 0)

  const byLGA: Record<string, number> = {}
  const byWard: Record<string, number> = {}
  const bySettlement: Record<string, number> = {}

  submissions.forEach(s => {
    const lga = s.lga ?? 'Unknown'
    const ward = s.ward ?? 'Unknown'
    const settlement = s.settlement ?? 'Unknown'
    const total = s.extraction?.totalVaccinatedToday ?? 0
    byLGA[lga] = (byLGA[lga] ?? 0) + total
    byWard[ward] = (byWard[ward] ?? 0) + total
    bySettlement[settlement] = (bySettlement[settlement] ?? 0) + total
  })

  const ageBreakdown = {
    zeroDose9to11: 0, zeroDose12to23: 0,
    otherDose9to11: 0, otherDose12to23: 0, otherDose24to59: 0
  }
  submissions.forEach(s => {
    const st = s.extraction?.subTotals
    if (!st) return
    ageBreakdown.zeroDose9to11 += (st.zeroDose9to11?.male ?? 0) + (st.zeroDose9to11?.female ?? 0)
    ageBreakdown.zeroDose12to23 += (st.zeroDose12to23?.male ?? 0) + (st.zeroDose12to23?.female ?? 0)
    ageBreakdown.otherDose9to11 += (st.otherDose9to11?.male ?? 0) + (st.otherDose9to11?.female ?? 0)
    ageBreakdown.otherDose12to23 += (st.otherDose12to23?.male ?? 0) + (st.otherDose12to23?.female ?? 0)
    ageBreakdown.otherDose24to59 += (st.otherDose24to59?.male ?? 0) + (st.otherDose24to59?.female ?? 0)
  })

  return {
    vaccinatedToday,
    sheetsSubmitted: submissions.length,
    flaggedForReview: flagged.length,
    byLGA, byWard, bySettlement, ageBreakdown
  }
}

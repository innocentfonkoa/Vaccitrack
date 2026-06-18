// Dashboard-specific backend functions.
// Reads from the same 'submissions' Firestore collection as the vaccinator
// app, but adds role-based filtering (LGA staff see only their LGA,
// state staff see all LGAs in their state).

import {
  collection, getDocs, query, where, orderBy
} from 'firebase/firestore'
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
  lga?: string // required for lga_staff, optional for state_staff
  displayName: string
}

// Fetch the logged-in user's profile from Firestore 'staff' collection.
// Admin creates these documents when provisioning a new staff account.
export async function getDashboardUser(uid: string): Promise<DashboardUser | null> {
  const snap = await getDoc(doc(db, 'staff', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as DashboardUser
}

export async function dashboardSignOut(): Promise<void> {
  await signOut(auth)
}

// Fetch submissions visible to this user based on their role.
// LGA staff: filtered to their LGA only.
// State staff: all LGAs in their state.
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
    // state_staff: all submissions in their state
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

// Derive summary stats from a list of submissions for KPI cards.
export interface DashboardStats {
  vaccinatedToday: number
  sheetsSubmitted: number
  flaggedForReview: number
  byLGA: Record<string, number>
  bySettlement: Record<string, number>
  ageBreakdown: {
    zeroDose9to11: number
    zeroDose12to23: number
    otherDose9to11: number
    otherDose12to23: number
    otherDose24to59: number
  }
  trend: { date: string; total: number }[]
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function computeDashboardStats(submissions: TallySubmission[]): DashboardStats {
  const today = todayStr()
  const todaySubmissions = submissions.filter(s => s.submittedAt?.slice(0, 10) === today)
  const flagged = submissions.filter(s =>
    s.extraction?.confidence === 'low' ||
    (s.extraction?.lowConfidenceFields && s.extraction.lowConfidenceFields.length > 0)
  )

  // Vaccinated today total
  const vaccinatedToday = todaySubmissions.reduce((sum, s) => {
    return sum + (s.extraction?.totalVaccinatedToday ?? 0)
  }, 0)

  // By LGA
  const byLGA: Record<string, number> = {}
  todaySubmissions.forEach(s => {
    const lga = s.lga ?? 'Unknown'
    byLGA[lga] = (byLGA[lga] ?? 0) + (s.extraction?.totalVaccinatedToday ?? 0)
  })

  // By settlement
  const bySettlement: Record<string, number> = {}
  todaySubmissions.forEach(s => {
    const settlement = s.settlement ?? 'Unknown'
    bySettlement[settlement] = (bySettlement[settlement] ?? 0) + (s.extraction?.totalVaccinatedToday ?? 0)
  })

  // Age group breakdown (aggregate subTotals across today's submissions)
  const ageBreakdown = {
    zeroDose9to11: 0,
    zeroDose12to23: 0,
    otherDose9to11: 0,
    otherDose12to23: 0,
    otherDose24to59: 0
  }
  todaySubmissions.forEach(s => {
    const st = s.extraction?.subTotals
    if (!st) return
    ageBreakdown.zeroDose9to11 += (st.zeroDose9to11?.male ?? 0) + (st.zeroDose9to11?.female ?? 0)
    ageBreakdown.zeroDose12to23 += (st.zeroDose12to23?.male ?? 0) + (st.zeroDose12to23?.female ?? 0)
    ageBreakdown.otherDose9to11 += (st.otherDose9to11?.male ?? 0) + (st.otherDose9to11?.female ?? 0)
    ageBreakdown.otherDose12to23 += (st.otherDose12to23?.male ?? 0) + (st.otherDose12to23?.female ?? 0)
    ageBreakdown.otherDose24to59 += (st.otherDose24to59?.male ?? 0) + (st.otherDose24to59?.female ?? 0)
  })

  // 5-day trend
  const trendMap: Record<string, number> = {}
  for (let i = 4; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    trendMap[d.toISOString().slice(0, 10)] = 0
  }
  submissions.forEach(s => {
    const date = s.submittedAt?.slice(0, 10)
    if (date && trendMap[date] !== undefined) {
      trendMap[date] += s.extraction?.totalVaccinatedToday ?? 0
    }
  })
  const trend = Object.entries(trendMap).map(([date, total]) => ({ date, total }))

  return {
    vaccinatedToday,
    sheetsSubmitted: todaySubmissions.length,
    flaggedForReview: flagged.length,
    byLGA,
    bySettlement,
    ageBreakdown,
    trend
  }
}

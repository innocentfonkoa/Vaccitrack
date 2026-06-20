// Real backend for VacciTrack, using Firestore (data) and Firebase Storage
// (tally sheet photos).
//
// Campaign selection and the vaccinator's own name/team-code profile stay
// in localStorage — those are deliberately per-device preferences, not
// shared data (see tally_extraction_plan.md section 11/12 reasoning).
// Submissions, however, now live in Firestore so the office dashboard and
// every vaccinator's phone read from the same shared source.

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  orderBy
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'
import type { Campaign, Vaccinator, TallySubmission } from '../types'

const SELECTED_CAMPAIGN_KEY = 'vaccitrack_selected_campaign'
const VACCINATOR_PROFILE_KEY = 'vaccitrack_vaccinator_profile'

const SUBMISSIONS_COLLECTION = 'submissions'

// Campaigns are still a small, fixed list for now. If/when campaigns need
// to be created or edited from the office dashboard, move this to its own
// Firestore 'campaigns' collection — the function signatures below already
// match what that change would look like (all async, same return shapes).
const CAMPAIGNS: Campaign[] = [
  { id: 'measles-2024', name: '2024 Measles Campaign', active: true, reportingDeadline: '20:00' },
  { id: 'polio-2026', name: '2026 Polio Campaign', active: true, reportingDeadline: '20:00' }
]

export async function getCampaigns(): Promise<Campaign[]> {
  return CAMPAIGNS
}

export async function getActiveCampaigns(): Promise<Campaign[]> {
  return CAMPAIGNS.filter(c => c.active)
}

export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  return CAMPAIGNS.find(c => c.id === campaignId) ?? null
}

// --- Campaign selection (per-device, daily — Option A) ---

interface StoredCampaignSelection {
  campaignId: string
  selectedOnDate: string // YYYY-MM-DD
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getSelectedCampaignId(): string | null {
  const raw = localStorage.getItem(SELECTED_CAMPAIGN_KEY)
  if (!raw) return null
  try {
    const stored: StoredCampaignSelection = JSON.parse(raw)
    if (stored.selectedOnDate !== todayDateString()) {
      return null
    }
    return stored.campaignId
  } catch {
    return null
  }
}

export function setSelectedCampaignId(campaignId: string): void {
  const stored: StoredCampaignSelection = { campaignId, selectedOnDate: todayDateString() }
  localStorage.setItem(SELECTED_CAMPAIGN_KEY, JSON.stringify(stored))
}

export function clearSelectedCampaign(): void {
  localStorage.removeItem(SELECTED_CAMPAIGN_KEY)
}

export function switchCampaign(): void {
  clearSelectedCampaign()
}

// --- Vaccinator profile (per-device — name + team code, entered once) ---

export function getVaccinatorProfile(): Vaccinator | null {
  const raw = localStorage.getItem(VACCINATOR_PROFILE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveVaccinatorProfile(profile: Vaccinator): void {
  localStorage.setItem(VACCINATOR_PROFILE_KEY, JSON.stringify(profile))
}

export function clearVaccinatorProfile(): void {
  localStorage.removeItem(VACCINATOR_PROFILE_KEY)
}

export async function getCurrentVaccinator(): Promise<Vaccinator | null> {
  return getVaccinatorProfile()
}

// --- Submissions (shared, Firestore-backed) ---

export async function getSubmissionsForVaccinator(
  vaccinatorId: string,
  campaignId: string
): Promise<TallySubmission[]> {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('vaccinatorId', '==', vaccinatorId),
    where('campaignId', '==', campaignId),
    orderBy('submittedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TallySubmission))
}

export async function hasSubmittedToday(
  vaccinatorId: string,
  campaignId: string
): Promise<boolean> {
  const today = todayDateString()
  const subs = await getSubmissionsForVaccinator(vaccinatorId, campaignId)
  return subs.some(s => s.submittedAt.slice(0, 10) === today)
}

// Uploads the tally sheet photo to Firebase Storage and returns its public
// download URL. Path includes campaign/vaccinator/date so files are easy
// to browse directly in the Storage console if ever needed.
//
// IMPORTANT: contentType is set explicitly here. Without it, the Blob's
// own .type property (which can be empty depending on how the photo was
// captured) is all the Storage SDK has to go on — and an empty/undefined
// contentType fails any Storage Rule that checks
// request.resource.contentType.matches('image/.*').
async function uploadTallyPhoto(
  photoBlob: Blob,
  campaignId: string,
  vaccinatorId: string
): Promise<string> {
  const timestamp = Date.now()
  const date = new Date().toISOString().slice(0, 10)
  const path = `tally-photos/${campaignId}/${date}/${vaccinatorId}/${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, photoBlob, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

export async function submitTallySheet(
  submission: Omit<TallySubmission, 'id'>,
  photoBlob?: Blob
): Promise<TallySubmission> {
  let photoUrl = submission.photoUrl

  // If a real photo blob was passed (rather than just a local blob: URL),
  // upload it to Storage and use the resulting hosted URL instead — this
  // is what makes the photo visible to the office dashboard later, not
  // just on the submitting vaccinator's own phone.
  if (photoBlob) {
    photoUrl = await uploadTallyPhoto(photoBlob, submission.campaignId, submission.vaccinatorId)
  }

  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
    ...submission,
    photoUrl
  })

  return { id: docRef.id, ...submission, photoUrl }
}

// All submissions across all vaccinators — used by the office dashboard.
export async function getAllSubmissions(campaignId: string): Promise<TallySubmission[]> {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('campaignId', '==', campaignId),
    orderBy('submittedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TallySubmission))
}

export async function resolveSubmission(
  submissionId: string,
  resolvedTotal: number,
  resolvedBy: string
): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId)
  await updateDoc(docRef, {
    resolvedTotal,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    status: 'resolved'
  })
}

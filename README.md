# VacciTrack — Vaccinator App

Mobile-first PWA for vaccinators to capture tally sheets and submit daily
totals to the office. Built with React + TypeScript + Vite, backed by
Firebase (Firestore + Storage).

## Status

This is the **vaccinator app**. Submissions and tally sheet photos are now
stored in a real, shared Firebase backend (`src/data/backend.ts`,
`src/data/firebase.ts`) — every vaccinator's data lands in one place, ready
for the office dashboard to read from. Campaign selection and the
vaccinator's own name/team-code profile remain on-device (localStorage),
since those are deliberately per-phone preferences, not shared data.

## Setup

Requires Node.js 18+.

```bash
npm install
npm run dev
```

## Firestore index (one-time setup, may be required)

The submissions queries use `where` + `orderBy` together, which Firestore
sometimes requires a composite index for. If you see an error in the
browser console mentioning "The query requires an index," it will include
a direct link — click it, then click "Create index" in the Firebase
console. This only needs to be done once per query shape.

## What's implemented (Core v1.1, per the planning doc)

- **Location picker**: State → LGA → Ward → Settlement cascading dropdown,
  using the real Kano State settlement register (`src/data/locationHierarchy.json`,
  39,258 settlements / 484 wards / 44 LGAs — location fields only, as scoped).
  Includes "Other (not on list)" free-text fallback.
- **Two-screen capture flow**: Screen 1 (`CaptureScreen.tsx`) is location +
  camera only; Screen 2 (`ReviewScreen.tsx`) shows the Male/Female breakdown
  and total, appearing only after the photo is captured and read.
- **AI extraction**: currently mocked (`src/data/aiExtraction.ts`) — simulates
  the Core v1.1 fallback logic (grand total → total row → sum of sub-totals)
  and randomly returns either a clean high-confidence result or a
  low-confidence one requiring manual entry, to exercise both UI paths.
- **One submission per day**: enforced in `App.tsx` via `hasSubmittedToday()`.
- **Daily campaign selection (Option A)**: the vaccinator's campaign choice
  is remembered only for the rest of that calendar day; a new day always
  shows the picker again.
- **Vaccinator profile**: name + team code entered once, remembered on-device.
- **Submission history**: scoped per campaign, shows synced/reviewed status
  and a running campaign total.
- **Multi-campaign ready**: every submission is tagged with `campaignId`.

## Firebase project

Project: `vaccitrack-336be`. Uses Firestore (test-mode rules, expiring
2026-07-18) and Storage (test-mode rules, same expiry) on the Blaze plan.
**Before any real campaign goes live, replace the test-mode security rules**
with rules that actually restrict access — test mode allows anyone with the
project URL to read/write everything.

## Connecting the real AI vision API

Replace the mock in `src/data/aiExtraction.ts` with the real Claude vision
API call — the commented-out implementation at the bottom of that file is
ready to uncomment and wire up.

## Next steps

- Office dashboard (separate app/route) — Admin and LGA/State staff login,
  live coverage view reading from the same Firestore `submissions`
  collection, flagged-sheet review screen using `resolveSubmission()`.
- Lock down Firestore/Storage security rules before real campaign use.
- Real Claude vision API integration for tally sheet reading.


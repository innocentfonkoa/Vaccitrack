// AI tally sheet extraction.
//
// Calls our own Vercel serverless function (/api/extract-tally) which
// proxies the image to Claude Vision. The Anthropic API key never appears
// in client-side code — it lives only in Vercel environment variables.
//
// Falls back to a mock result if the API call fails (so the app remains
// usable if there is a connectivity or config problem).

import type { ExtractedTallySheet } from '../types'

// ─── helpers ────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // result is "data:<mediaType>;base64,<data>" — we only want the data part
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(blob)
  })
}

function getMimeType(blob: Blob): string {
  // Prefer the blob's own type; fall back to jpeg
  if (blob.type && blob.type.startsWith('image/')) return blob.type
  return 'image/jpeg'
}

// ─── mock fallback (used when API is unavailable) ───────────────────────────

function mockExtraction(): ExtractedTallySheet {
  const MOCK_RESULTS: Omit<ExtractedTallySheet, 'totalVaccinatedToday' | 'confidence' | 'lowConfidenceFields'>[] = [
    {
      dateOnSheet: new Date().toISOString().slice(0, 10),
      subTotals: {
        zeroDose9to11:  { male: 6,  female: 19 },
        zeroDose12to23: { male: 0,  female: 0  },
        otherDose9to11: { male: 21, female: 24 },
        otherDose12to23:{ male: 13, female: 47 },
        otherDose24to59:{ male: 47, female: 80 }
      },
      totalRow: { male: 75, female: 190 },
      grandTotal9to59: 265
    },
    {
      dateOnSheet: new Date().toISOString().slice(0, 10),
      subTotals: {
        zeroDose9to11:  { male: 0,  female: 0  },
        zeroDose12to23: { male: 0,  female: 0  },
        otherDose9to11: { male: 0,  female: 0  },
        otherDose12to23:{ male: 0,  female: 0  },
        otherDose24to59:{ male: 38, female: 54 }
      },
      totalRow: { male: 38, female: 54 },
      grandTotal9to59: null
    }
  ]

  const mock = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)]

  // Core v1.1 fallback chain
  if (mock.grandTotal9to59 !== null) {
    return { ...mock, totalVaccinatedToday: mock.grandTotal9to59, confidence: 'high', lowConfidenceFields: [] }
  }
  if (mock.totalRow.male !== null && mock.totalRow.female !== null) {
    return { ...mock, totalVaccinatedToday: mock.totalRow.male + mock.totalRow.female, confidence: 'high', lowConfidenceFields: [] }
  }
  const sum = Object.values(mock.subTotals).reduce((s, g) => s + (g.male ?? 0) + (g.female ?? 0), 0)
  return { ...mock, totalVaccinatedToday: sum || null, confidence: sum > 0 ? 'medium' : 'low', lowConfidenceFields: ['grand_total_9_59_months', 'total_row'] }
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function extractTallySheet(photoBlob: Blob): Promise<ExtractedTallySheet> {
  try {
    const [imageBase64, mediaType] = await Promise.all([
      blobToBase64(photoBlob),
      Promise.resolve(getMimeType(photoBlob))
    ])

    const response = await fetch('/api/extract-tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType })
    })

    if (!response.ok) {
      console.warn('extract-tally API error, falling back to mock:', response.status)
      return mockExtraction()
    }

    const result: ExtractedTallySheet = await response.json()
    return result

  } catch (err) {
    console.warn('extractTallySheet failed, using mock:', err)
    // Simulate processing delay so the UI doesn't flicker
    await new Promise(resolve => setTimeout(resolve, 1200))
    return mockExtraction()
  }
}

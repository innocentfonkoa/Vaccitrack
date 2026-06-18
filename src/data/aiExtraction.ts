// AI tally sheet extraction.
//
// Currently MOCKED — simulates the Claude Vision API call described in
// tally_extraction_plan.md (Core v1.1 prompt). When ready to go live,
// replace the body of extractTallySheet() with a real fetch to
// /v1/messages, sending the photo as base64 and using the Core v1.1
// system prompt. The return shape (ExtractedTallySheet) does not change.

import type { ExtractedTallySheet } from '../types'

function computeTotalVaccinatedToday(
  grandTotal: number | null,
  totalRow: { male: number | null; female: number | null },
  subTotals: ExtractedTallySheet['subTotals']
): { total: number | null; confidence: ExtractedTallySheet['confidence']; flags: string[] } {
  const flags: string[] = []

  // Fallback chain from the plan: grand total -> total row -> sum of sub totals
  if (grandTotal !== null) {
    return { total: grandTotal, confidence: 'high', flags }
  }

  if (totalRow.male !== null && totalRow.female !== null) {
    return { total: totalRow.male + totalRow.female, confidence: 'high', flags }
  }

  const subTotalSum = Object.values(subTotals).reduce((sum, group) => {
    return sum + (group.male ?? 0) + (group.female ?? 0)
  }, 0)

  if (subTotalSum > 0) {
    flags.push('grand_total_9_59_months', 'total_row')
    return { total: subTotalSum, confidence: 'medium', flags }
  }

  flags.push('total_vaccinated_today')
  return { total: null, confidence: 'low', flags }
}

// Simulated extraction results, mirroring the variety we saw in the 11
// real test sheets — used to demo the review/confirm flow in the app
// without a live vision API call.
const MOCK_RESULTS: Omit<ExtractedTallySheet, 'totalVaccinatedToday' | 'confidence' | 'lowConfidenceFields'>[] = [
  {
    dateOnSheet: new Date().toISOString().slice(0, 10),
    subTotals: {
      zeroDose9to11: { male: 6, female: 19 },
      zeroDose12to23: { male: 0, female: 0 },
      otherDose9to11: { male: 21, female: 24 },
      otherDose12to23: { male: 13, female: 47 },
      otherDose24to59: { male: 47, female: 80 }
    },
    totalRow: { male: 75, female: 190 },
    grandTotal9to59: 265
  },
  {
    dateOnSheet: new Date().toISOString().slice(0, 10),
    subTotals: {
      zeroDose9to11: { male: 0, female: 0 },
      zeroDose12to23: { male: 0, female: 0 },
      otherDose9to11: { male: 0, female: 0 },
      otherDose12to23: { male: 0, female: 0 },
      otherDose24to59: { male: 38, female: 54 }
    },
    totalRow: { male: 38, female: 54 },
    grandTotal9to59: null // left blank on the sheet, like w-43
  }
]

export async function extractTallySheet(_photoBlob: Blob): Promise<ExtractedTallySheet> {
  // Simulate network/processing delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const mock = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)]
  const { total, confidence, flags } = computeTotalVaccinatedToday(
    mock.grandTotal9to59,
    mock.totalRow,
    mock.subTotals
  )

  return {
    ...mock,
    totalVaccinatedToday: total,
    confidence,
    lowConfidenceFields: flags
  }
}

/*
REAL IMPLEMENTATION (when ready to connect Claude's vision API):

export async function extractTallySheet(photoBlob: Blob): Promise<ExtractedTallySheet> {
  const base64 = await blobToBase64(photoBlob)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: CORE_V1_1_PROMPT } // see tally_extraction_plan.md section 10
        ]
      }]
    })
  })
  const data = await response.json()
  const text = data.content.find((c: any) => c.type === 'text')?.text ?? '{}'
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}
*/

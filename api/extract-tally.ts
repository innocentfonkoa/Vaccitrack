import type { VercelRequest, VercelResponse } from '@vercel/node'

const TALLY_PROMPT = `You are an expert at reading Nigerian vaccination campaign tally sheets.

## SHEET ORIENTATION
The photo may be rotated 90 degrees sideways. The text "2024 MEASLES CAMPAIGN, NIGERIA" and "TALLY SHEET FOR VACCINATION TEAMS" appears along the left or right edge. Rotate your reading accordingly.

## SHEET STRUCTURE
The sheet has a grid with these ROW GROUPS (from top to bottom when oriented correctly):
1. "9-11 Months" / "Zero Doses" 
2. "12-23 Months" / "Zero Dose"
3. "9-11 Months" / "(Other dose)"
4. "12-23 Months" / "(Other dose)"
5. "24-59 Months" / "(Other dose)"

Each row group has:
- A MALE column (marked "Male" or "M")
- A FEMALE column (marked "Female" or "F")
- Possibly multiple SETTLEMENT sub-columns (Settlement 1, Settlement 2, etc.)
- A SUB-TOTAL cell on the right

## HOW CHILDREN ARE RECORDED
Each vaccinated child is recorded as a small CIRCLE (○) or dot in the cell.
- Circles are arranged in grids, typically 10 per row
- Count EVERY circle/dot in the cell — do not trust any handwritten numbers
- If there are multiple settlement columns, SUM all settlements for that row

## YOUR EXTRACTION TASK
For each of the 5 age groups:
1. Count all circles in the Male column(s) → male count
2. Count all circles in the Female column(s) → female count

Then compute:
- totalRow.male = sum of all 5 male counts
- totalRow.female = sum of all 5 female counts  
- grandTotal9to59 = totalRow.male + totalRow.female
- totalVaccinatedToday = grandTotal9to59

## CRITICAL RULES
- NEVER copy handwritten subtotals or grand totals — always count circles yourself
- If a cell is empty or blank, return 0
- If circles are hard to count precisely, estimate carefully and note in lowConfidenceFields
- If the image is too blurry to read a specific cell, return 0 and add that field to lowConfidenceFields
- Set confidence = "high" if you can clearly count all cells
- Set confidence = "medium" if some cells were estimated
- Set confidence = "low" if more than 2 cells were unreadable

## OUTPUT FORMAT
Return ONLY this JSON — no markdown, no explanation, no extra text:
{
  "dateOnSheet": "YYYY-MM-DD or null",
  "subTotals": {
    "zeroDose9to11":   { "male": 0, "female": 0 },
    "zeroDose12to23":  { "male": 0, "female": 0 },
    "otherDose9to11":  { "male": 0, "female": 0 },
    "otherDose12to23": { "male": 0, "female": 0 },
    "otherDose24to59": { "male": 0, "female": 0 }
  },
  "totalRow": { "male": 0, "female": 0 },
  "grandTotal9to59": 0,
  "totalVaccinatedToday": 0,
  "confidence": "high",
  "lowConfidenceFields": []
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { imageBase64, mediaType } = req.body as {
    imageBase64: string
    mediaType: string
  }

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64
                }
              },
              { type: 'text', text: TALLY_PROMPT }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return res.status(502).json({ error: 'Upstream API error', detail: err })
    }

    const data = await response.json()
    const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '{}'

    let parsed
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      console.error('Failed to parse Claude response:', text)
      return res.status(502).json({ error: 'Invalid JSON from Claude', raw: text })
    }

    // Server-side safety net: always recompute totals from subTotals
    // so vaccinator addition errors never reach the dashboard
    if (parsed.subTotals) {
      const st = parsed.subTotals
      const groups = [
        st.zeroDose9to11, st.zeroDose12to23,
        st.otherDose9to11, st.otherDose12to23, st.otherDose24to59
      ]
      const totalMale   = groups.reduce((s: number, g: any) => s + (g?.male   ?? 0), 0)
      const totalFemale = groups.reduce((s: number, g: any) => s + (g?.female ?? 0), 0)
      parsed.totalRow            = { male: totalMale, female: totalFemale }
      parsed.grandTotal9to59     = totalMale + totalFemale
      parsed.totalVaccinatedToday = parsed.grandTotal9to59
    }

    return res.status(200).json(parsed)

  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

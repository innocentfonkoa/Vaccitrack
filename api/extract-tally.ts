// api/extract-tally.ts
// Vercel serverless function — proxies tally sheet images to Claude Vision.
// The Anthropic API key lives in Vercel environment variables (never in
// client-side code). This function is the only place it is used.

import type { VercelRequest, VercelResponse } from '@vercel/node'

const CORE_V1_1_PROMPT = `You are reading a Nigerian measles vaccination tally sheet photo.
Extract the following fields and return ONLY valid JSON with no markdown fences.

Return this exact shape:
{
  "dateOnSheet": "YYYY-MM-DD or null",
  "subTotals": {
    "zeroDose9to11":  { "male": number|null, "female": number|null },
    "zeroDose12to23": { "male": number|null, "female": number|null },
    "otherDose9to11": { "male": number|null, "female": number|null },
    "otherDose12to23":{ "male": number|null, "female": number|null },
    "otherDose24to59":{ "male": number|null, "female": number|null }
  },
  "totalRow":        { "male": number|null, "female": number|null },
  "grandTotal9to59": number|null,
  "totalVaccinatedToday": number|null,
  "confidence": "high"|"medium"|"low",
  "lowConfidenceFields": []
}

Extraction rules (Core v1.1 fallback chain):
1. Prefer grandTotal9to59 (the printed grand total box, age 9–59 months).
2. If that cell is blank/illegible, sum totalRow.male + totalRow.female.
3. If the total row is also missing, sum all subTotal male+female values.
4. Set confidence = "high" if rule 1 or 2 succeeded with a clearly legible number.
5. Set confidence = "medium" if rule 3 was used.
6. Set confidence = "low" if the image is too blurry, partial, or no numbers are readable.
7. Add the name of any field you were uncertain about to lowConfidenceFields.
8. Return null for any field you cannot read — never guess or fabricate numbers.`

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
              { type: 'text', text: CORE_V1_1_PROMPT }
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

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, fileName } = req.body;

  if (!text || text.trim().length < 50) {
    return res.status(400).json({ error: 'Contract text too short or missing' });
  }

  const contractText = text.slice(0, 18000);

  const prompt = `You are an expert legal analyst. Analyze the following contract and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

The JSON must have exactly this structure:
{
  "riskLevel": "High" or "Medium" or "Low",
  "riskSummary": ["string", "string", "string"],
  "keyClauses": [
    { "clause": "Clause Name", "explanation": "What it means and why it matters" }
  ],
  "redFlags": ["string"],
  "recommendedQuestions": ["string"]
}

Guidelines:
- riskLevel: overall risk assessment based on the contract content
- riskSummary: 3–5 concise bullet points covering the most important risks
- keyClauses: 4–6 of the most significant clauses with plain-language explanations
- redFlags: 0–5 serious concerns worth flagging; empty array if none
- recommendedQuestions: 3–5 questions the client should ask the counterparty before signing

CONTRACT: "${fileName || 'Untitled'}"

${contractText}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const raw = data.content[0].text.trim();

    let analysis;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', e, '\nRaw:', raw);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    res.json(analysis);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

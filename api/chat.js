export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, contracts } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Build contract context from analysis data
  let contractCtx = '';
  if (contracts && contracts.length > 0) {
    contractCtx = '\n\n---\nUSER\'S ANALYZED CONTRACTS:\n\n';
    contracts.forEach((c, idx) => {
      const name = c.file_name || c.fileName || 'Unnamed';
      const risk = c.risk_level || c.riskLevel || 'Unknown';
      const date = c.analyzed_at || c.analyzedAt || '';
      const data = c.analysis_data || c;

      contractCtx += `CONTRACT ${idx + 1}: "${name}"\n`;
      contractCtx += `Risk Level: ${risk}\n`;
      if (date) {
        contractCtx += `Analyzed: ${new Date(date).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        })}\n`;
      }

      if (data.riskSummary && data.riskSummary.length) {
        contractCtx += 'Risk Summary:\n' + data.riskSummary.map(r => `  - ${r}`).join('\n') + '\n';
      }
      if (data.keyClauses && data.keyClauses.length) {
        contractCtx += 'Key Clauses:\n' + data.keyClauses.map(kc => `  - ${kc.clause}: ${kc.explanation}`).join('\n') + '\n';
      }
      if (data.redFlags && data.redFlags.length) {
        contractCtx += 'Red Flags:\n' + data.redFlags.map(rf => `  - ${rf}`).join('\n') + '\n';
      }
      if (data.recommendedQuestions && data.recommendedQuestions.length) {
        contractCtx += 'Recommended Questions:\n' + data.recommendedQuestions.map(q => `  - ${q}`).join('\n') + '\n';
      }
      contractCtx += '\n';
    });
  } else {
    contractCtx = '\n\nThe user has not analyzed any contracts yet. Encourage them to upload their first contract using the "+ Upload" button.';
  }

  const system = `You are Lex, an expert AI legal counsel embedded in Loop & Convert — a contract risk analysis platform used by legal professionals and law firms.

Your personality: Sharp, concise, and authoritative. You speak like a trusted senior attorney — direct and precise, not academic. You cut through legal complexity and tell people what actually matters.

Your capabilities:
- Answer questions about the user's analyzed contracts
- Explain specific clauses, risks, and red flags in plain language
- Compare clauses or risk levels across multiple contracts
- Suggest negotiation tactics and questions to raise with counterparties
- Help prioritize which contracts need urgent attention
- Explain legal terminology without unnecessary jargon

Rules:
- Always reference contracts by their exact file name when discussing them
- Keep responses concise — use bullet points when listing multiple items
- Be direct and professional
- If something genuinely requires a qualified lawyer's review, say so honestly
- Never fabricate clause details — only reference what is in the provided contract data
${contractCtx}`;

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
        max_tokens: 1024,
        system,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    res.json({ content: data.content[0].text });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const MAX_TEXT_CHARS = 80000; // ~20k tokens — covers up to ~40 pages

const SYSTEM_PROMPT = `You are an expert legal analyst specializing in contract risk assessment for law firms.

Analyze the provided contract and return a structured JSON risk assessment.

IMPORTANT: Respond with ONLY a valid JSON object. No markdown, no code blocks, no explanations — raw JSON only.

Required JSON structure:
{
  "overall_risk_score": <integer 0-100>,
  "risk_level": <"low" | "medium" | "high" | "critical">,
  "executive_summary": "<2-4 sentence overview of the contract and its key risks>",
  "risk_items": [
    {
      "category": "<e.g. Liability, Payment Terms, Termination, IP Ownership, Confidentiality, Indemnification>",
      "severity": <"critical" | "high" | "medium" | "low">,
      "clause_excerpt": "<exact problematic quote from the contract, max 200 characters>",
      "page_number": <integer or null>,
      "explanation": "<why this is a risk, 1-3 sentences>",
      "recommendation": "<what to negotiate or change, 1-2 sentences>"
    }
  ],
  "missing_clauses": ["<clause name>"]
}

Risk score guidelines:
- 0-24:   Low      — standard contract, minor or no issues
- 25-49:  Medium   — some concerning clauses worth negotiating
- 50-74:  High     — significant risks requiring legal attention
- 75-100: Critical — severe issues, do not sign without major revisions

Analyze thoroughly: unlimited liability, unfair payment or penalty terms, one-sided termination,
IP assignment, confidentiality obligations, indemnification scope, auto-renewal traps,
governing law, warranty exclusions, force majeure, and missing protective clauses.

Order risk_items by severity (critical first). Be thorough — identify ALL significant risks.`;

function parseJson(raw) {
  var clean = raw.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

function normalizeLevel(v) {
  var valid = ['low', 'medium', 'high', 'critical'];
  var s = String(v || '').toLowerCase().trim();
  if (valid.includes(s)) return s;
  if (s.includes('critical')) return 'critical';
  if (s.includes('high'))     return 'high';
  if (s.includes('medium'))   return 'medium';
  return 'low';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { contract_id, text } = req.body || {};
  if (!contract_id) return res.status(400).json({ error: 'contract_id is required' });
  if (!text || text.trim().length < 100) {
    return res.status(400).json({
      error: 'Could not extract enough text. This may be a scanned (image-only) PDF. Please use a text-based PDF.'
    });
  }

  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Validate JWT
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Authorization header missing' });

  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  // Load requester profile
  const { data: requester } = await adminClient
    .from('profiles').select('firm_id, role').eq('id', user.id).single();
  if (!requester) return res.status(403).json({ error: 'Profile not found' });

  // Load and verify contract ownership
  const { data: contract } = await adminClient
    .from('contracts').select('id, firm_id, status, file_name').eq('id', contract_id).single();
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const owns = requester.role === 'super_admin' || contract.firm_id === requester.firm_id;
  if (!owns) return res.status(403).json({ error: 'Access denied' });

  if (contract.status === 'processing') return res.status(409).json({ error: 'Already being analyzed' });
  if (contract.status === 'completed')  return res.status(409).json({ error: 'Already analyzed' });

  // Mark as processing and store extracted text for chat feature
  await adminClient.from('contracts')
    .update({ status: 'processing', extracted_text: text.slice(0, 200000) })
    .eq('id', contract_id);

  const startMs     = Date.now();
  const contractText = text.length > MAX_TEXT_CHARS
    ? text.slice(0, MAX_TEXT_CHARS) + '\n\n[Document truncated — exceeds 80,000 character analysis limit]'
    : text;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model:      'claude-opus-4-8',
      max_tokens: 8000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: 'Analyze this contract:\n\n' + contractText }]
    });

    if (message.stop_reason === 'max_tokens') {
      throw new Error('Response was cut off — contract may be too complex. Try a shorter document.');
    }

    const rawText = message.content[0]?.text || '';
    if (!rawText) throw new Error('Empty response from AI model');
    const parsed  = parseJson(rawText);

    // Normalize fields
    const riskScore = Math.max(0, Math.min(100, Math.round(Number(parsed.overall_risk_score) || 0)));
    const riskLevel = normalizeLevel(parsed.risk_level);
    const summary   = String(parsed.executive_summary || '').slice(0, 2000);
    const riskItems = Array.isArray(parsed.risk_items)      ? parsed.risk_items      : [];
    const missing   = Array.isArray(parsed.missing_clauses) ? parsed.missing_clauses : [];
    const processingMs = Date.now() - startMs;

    // Save analysis
    const { data: analysis, error: aErr } = await adminClient
      .from('analyses')
      .insert({
        contract_id:        contract_id,
        overall_risk_score: riskScore,
        risk_level:         riskLevel,
        executive_summary:  summary,
        model_version:      'claude-opus-4-8',
        processing_ms:      processingMs,
        raw_json:           { ...parsed, missing_clauses: missing }
      })
      .select().single();

    if (aErr) throw new Error('Failed to save analysis: ' + aErr.message);

    // Save risk items (up to 50)
    if (riskItems.length > 0) {
      await adminClient.from('risk_items').insert(
        riskItems.slice(0, 50).map(function(item) {
          return {
            analysis_id:    analysis.id,
            category:       String(item.category      || 'General').slice(0, 100),
            severity:       normalizeLevel(item.severity),
            clause_excerpt: String(item.clause_excerpt || '').slice(0, 500) || null,
            page_number:    Number.isInteger(item.page_number) ? item.page_number : null,
            explanation:    String(item.explanation    || '').slice(0, 1000) || null,
            recommendation: String(item.recommendation || '').slice(0, 500)  || null
          };
        })
      );
    }

    // Mark complete
    await adminClient.from('contracts').update({ status: 'completed' }).eq('id', contract_id);

    // Audit
    await adminClient.from('audit_log').insert({
      firm_id:       contract.firm_id,
      actor_id:      user.id,
      action:        'contract_analyzed',
      resource_type: 'analyses',
      resource_id:   analysis.id,
      new_data:      { risk_score: riskScore, risk_level: riskLevel, items: riskItems.length }
    });

    return res.status(200).json({
      success:         true,
      analysis_id:     analysis.id,
      risk_score:      riskScore,
      risk_level:      riskLevel,
      risk_item_count: riskItems.length,
      processing_ms:   processingMs
    });

  } catch (err) {
    console.error('Analysis pipeline error:', err.message);
    await adminClient.from('contracts').update({ status: 'failed' }).eq('id', contract_id);
    return res.status(500).json({ error: 'Analysis failed: ' + (err.message || 'Unknown error') });
  }
}

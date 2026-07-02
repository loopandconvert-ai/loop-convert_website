import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const MAX_HISTORY    = 20;    // keep last 10 turns (20 messages)
const MAX_TEXT_CHARS = 60000; // ~15k tokens — fits in Sonnet context easily

function buildSystemPrompt(contract, analysis, riskItems, missingClauses, contractText) {
  var lines = [
    'You are Lex, an expert AI legal assistant embedded in Loop & Convert.',
    'You help lawyers and legal professionals understand contracts clearly and concisely.',
    'You speak like a trusted senior attorney — direct, precise, and practical.',
    '',
    '=== CONTRACT BEING DISCUSSED ===',
    'File: ' + contract.file_name,
    contract.contract_type ? 'Type: ' + contract.contract_type : '',
    '',
  ];

  if (analysis) {
    lines.push('=== RISK ASSESSMENT ===');
    lines.push('Risk Score: ' + analysis.overall_risk_score + '/100');
    lines.push('Risk Level: ' + analysis.risk_level.toUpperCase());
    if (analysis.executive_summary) {
      lines.push('');
      lines.push('Executive Summary:');
      lines.push(analysis.executive_summary);
    }
    lines.push('');
  }

  if (riskItems && riskItems.length) {
    lines.push('=== IDENTIFIED RISK ITEMS ===');
    riskItems.forEach(function(r, i) {
      lines.push((i + 1) + '. [' + r.severity.toUpperCase() + '] ' + r.category);
      if (r.clause_excerpt) lines.push('   Excerpt: "' + r.clause_excerpt + '"');
      if (r.explanation)    lines.push('   Issue: '    + r.explanation);
      if (r.recommendation) lines.push('   Fix: '      + r.recommendation);
    });
    lines.push('');
  }

  if (missingClauses && missingClauses.length) {
    lines.push('=== MISSING CLAUSES ===');
    lines.push(missingClauses.join(', '));
    lines.push('');
  }

  if (contractText && contractText.length > 50) {
    var truncated = contractText.length > MAX_TEXT_CHARS;
    lines.push('=== FULL CONTRACT TEXT' + (truncated ? ' (first ' + MAX_TEXT_CHARS + ' chars)' : '') + ' ===');
    lines.push(truncated ? contractText.slice(0, MAX_TEXT_CHARS) + '\n\n[... document truncated ...]' : contractText);
    lines.push('');
  }

  lines.push('INSTRUCTIONS:');
  lines.push('- Answer questions about THIS specific contract only.');
  lines.push('- Cite exact clause text or page numbers when available.');
  lines.push('- Use plain language — explain legal terms clearly.');
  lines.push('- Be concise and direct. Bullet points for multiple items.');
  lines.push('- If something is not in the contract, say so honestly.');
  lines.push('- For binding legal decisions, recommend consulting qualified counsel.');

  return lines.filter(function(l, i) {
    return !(l === '' && lines[i - 1] === '');
  }).join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { contract_id, messages } = req.body || {};
  if (!contract_id)                             return res.status(400).json({ error: 'contract_id is required' });
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages is required' });

  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Validate JWT
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Authorization header missing' });

  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: requester } = await adminClient
    .from('profiles').select('firm_id, role').eq('id', user.id).single();
  if (!requester) return res.status(403).json({ error: 'Profile not found' });

  // Load contract (includes extracted_text)
  const { data: contract } = await adminClient
    .from('contracts')
    .select('id, firm_id, file_name, contract_type, status, extracted_text')
    .eq('id', contract_id).single();
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const owns = requester.role === 'super_admin' || contract.firm_id === requester.firm_id;
  if (!owns) return res.status(403).json({ error: 'Access denied' });

  // Load analysis + risk items
  const { data: analysis } = await adminClient
    .from('analyses').select('*').eq('contract_id', contract_id).maybeSingle();

  var riskItems      = [];
  var missingClauses = [];
  if (analysis) {
    const rRes = await adminClient
      .from('risk_items').select('*').eq('analysis_id', analysis.id);
    riskItems      = rRes.data || [];
    missingClauses = (analysis.raw_json || {}).missing_clauses || [];
  }

  const systemPrompt = buildSystemPrompt(
    contract, analysis, riskItems, missingClauses, contract.extracted_text
  );

  const trimmed = messages.slice(-MAX_HISTORY);

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = anthropic.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   trimmed
    });

    for await (const text of stream.textStream) {
      res.write('data: ' + JSON.stringify({ text }) + '\n\n');
    }

    res.write('data: ' + JSON.stringify({ done: true }) + '\n\n');
    res.end();

  } catch (err) {
    console.error('Chat error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Chat failed: ' + (err.message || 'Unknown error') });
    }
    res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
    res.end();
  }
}

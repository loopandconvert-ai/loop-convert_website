import { createClient } from '@supabase/supabase-js';

async function auth(req, res) {
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Authorization header missing' }); return null; }
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid or expired token' }); return null; }
  const { data: profile } = await adminClient.from('profiles').select('firm_id, role').eq('id', user.id).single();
  if (!profile) { res.status(403).json({ error: 'Profile not found' }); return null; }
  return { adminClient, user, profile };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ctx = await auth(req, res);
  if (!ctx) return;
  const { adminClient, user, profile } = ctx;

  // ── GET: list sessions for a contract, or messages for a session ──
  if (req.method === 'GET') {
    const { contract_id, session_id } = req.query;

    if (session_id) {
      // Verify ownership
      const { data: sess } = await adminClient
        .from('chat_sessions').select('user_id').eq('id', session_id).single();
      if (!sess || sess.user_id !== user.id) return res.status(403).json({ error: 'Access denied' });

      const { data: msgs } = await adminClient
        .from('chat_messages').select('role, content, created_at')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });

      return res.json({ messages: msgs || [] });
    }

    if (contract_id) {
      // Verify contract ownership
      const { data: contract } = await adminClient
        .from('contracts').select('firm_id').eq('id', contract_id).single();
      if (!contract) return res.status(404).json({ error: 'Contract not found' });
      const owns = profile.role === 'super_admin' || contract.firm_id === profile.firm_id;
      if (!owns) return res.status(403).json({ error: 'Access denied' });

      const { data: sessions } = await adminClient
        .from('chat_sessions').select('id, title, created_at, updated_at')
        .eq('contract_id', contract_id)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);

      return res.json({ sessions: sessions || [] });
    }

    return res.status(400).json({ error: 'contract_id or session_id required' });
  }

  // ── POST: create a new session ────────────────────
  if (req.method === 'POST') {
    const { contract_id } = req.body || {};
    if (!contract_id) return res.status(400).json({ error: 'contract_id required' });

    const { data: contract } = await adminClient
      .from('contracts').select('firm_id').eq('id', contract_id).single();
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    const owns = profile.role === 'super_admin' || contract.firm_id === profile.firm_id;
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: session, error } = await adminClient
      .from('chat_sessions').insert({
        contract_id, firm_id: contract.firm_id, user_id: user.id, title: 'New Chat'
      }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ session });
  }

  // ── DELETE: delete a session ──────────────────────
  if (req.method === 'DELETE') {
    const session_id = (req.query && req.query.session_id) || (req.body && req.body.session_id);
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    const { data: sess } = await adminClient
      .from('chat_sessions').select('user_id').eq('id', session_id).single();
    if (!sess || sess.user_id !== user.id) return res.status(403).json({ error: 'Access denied' });

    await adminClient.from('chat_sessions').delete().eq('id', session_id);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Authorization required' });

  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const contract_id = req.query.contract_id;
  if (!contract_id) return res.status(400).json({ error: 'contract_id required' });

  const [contractRes, profileRes] = await Promise.all([
    adminClient.from('contracts').select('id, firm_id, file_name').eq('id', contract_id).single(),
    adminClient.from('profiles').select('firm_id, role').eq('id', user.id).single()
  ]);

  const contract = contractRes.data;
  const profile  = profileRes.data;

  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (!profile)  return res.status(403).json({ error: 'Profile not found' });

  if (profile.role !== 'super_admin' && contract.firm_id !== profile.firm_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Remove file from storage (best-effort — don't fail if missing)
  const storagePath = contract.firm_id + '/' + contract_id + '/' + contract.file_name;
  await adminClient.storage.from('contracts').remove([storagePath]);

  // Delete row — cascades to analyses, risk_items, chat_sessions, chat_messages
  const { error: delErr } = await adminClient.from('contracts').delete().eq('id', contract_id);
  if (delErr) return res.status(500).json({ error: 'Delete failed: ' + delErr.message });

  return res.json({ success: true });
}

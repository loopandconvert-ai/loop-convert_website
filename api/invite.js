import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, role = 'lawyer', firmId: targetFirmId } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!['lawyer', 'firm_admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be lawyer or firm_admin' });
  }

  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Validate requesting user's JWT
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Authorization header missing' });

  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  // Load requester's profile
  const { data: requester } = await adminClient
    .from('profiles')
    .select('*, firms(id, name, seat_limit, status)')
    .eq('id', user.id)
    .single();

  if (!requester) return res.status(403).json({ error: 'Profile not found' });
  if (!['super_admin', 'firm_admin'].includes(requester.role)) {
    return res.status(403).json({ error: 'Only firm admins can send invitations' });
  }

  // Determine target firm
  let firmId, firm;

  if (requester.role === 'super_admin') {
    if (!targetFirmId) {
      return res.status(400).json({ error: 'firmId is required for super admin invitations' });
    }
    const { data: targetFirm, error: firmErr } = await adminClient
      .from('firms').select('*').eq('id', targetFirmId).single();
    if (firmErr || !targetFirm) return res.status(404).json({ error: 'Firm not found' });
    if (targetFirm.status !== 'active') {
      return res.status(400).json({ error: 'Target firm is not active' });
    }
    firmId = targetFirmId;
    firm   = targetFirm;
  } else {
    // firm_admin: use their own firm
    firmId = requester.firm_id;
    firm   = requester.firms;
    if (!firm || firm.status !== 'active') {
      return res.status(403).json({ error: 'Your firm is not active' });
    }
  }

  // Enforce seat limit
  const { count: activeSeats } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('status', 'active');

  if (activeSeats >= firm.seat_limit) {
    return res.status(400).json({
      error: `Seat limit reached (${firm.seat_limit} seats). Upgrade your plan to add more lawyers.`
    });
  }

  // Check for existing active member with this email in this firm
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('firm_id', firmId)
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'This email already has an active account in this firm' });

  // Create invitation record first (trigger reads this when auth.users row is created)
  const { data: invitation, error: invErr } = await adminClient
    .from('invitations')
    .insert({ firm_id: firmId, email, role, invited_by: user.id })
    .select()
    .single();

  if (invErr) {
    console.error('Invitation insert error:', invErr);
    return res.status(500).json({ error: 'Failed to create invitation record' });
  }

  // Determine redirect URL
  const origin = process.env.SITE_URL
    || (req.headers.origin ? req.headers.origin : 'https://loop-convert.vercel.app');
  const redirectTo = `${origin}/invite-accept.html`;

  // Send invite email via Supabase Auth (creates auth.users row → fires handle_new_user trigger)
  const { error: emailErr } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (emailErr) {
    await adminClient.from('invitations').delete().eq('id', invitation.id);
    console.error('Supabase invite error:', emailErr);
    return res.status(500).json({ error: 'Failed to send invitation email: ' + emailErr.message });
  }

  // Audit log
  await adminClient.from('audit_log').insert({
    firm_id:       firmId,
    actor_id:      user.id,
    action:        'member_invited',
    resource_type: 'invitations',
    resource_id:   invitation.id,
    new_data:      { email, role }
  });

  return res.status(200).json({ success: true, invitation_id: invitation.id });
}

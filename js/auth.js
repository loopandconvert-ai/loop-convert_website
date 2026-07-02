(function () {
  'use strict';

  var cfg = window.LC_CONFIG;
  if (!cfg) { console.error('[LC] LC_CONFIG missing — load js/config.js first'); return; }

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  window.LC_SUPABASE = sb;

  // ── Helpers ──────────────────────────────────────────────────────

  function dashboardUrl(role) {
    if (role === 'super_admin') return 'superadmin.html';
    if (role === 'firm_admin')  return 'admin-dashboard.html';
    return 'lawyer-dashboard.html';
  }

  async function getProfile() {
    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    if (!session) return null;
    var p = await sb
      .from('profiles')
      .select('*, firms(id, name, seat_limit, subscription_tier, status)')
      .eq('id', session.user.id)
      .single();
    return p.data || null;
  }

  // ── Route guards ─────────────────────────────────────────────────

  async function requireAuth() {
    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  async function redirectIfAuthed() {
    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    if (!session) return;
    var profile = await getProfile();
    window.location.href = dashboardUrl(profile && profile.role);
  }

  // ── Public API ────────────────────────────────────────────────────

  window.LC_AUTH = {
    supabase: sb,

    getProfile: getProfile,
    requireAuth: requireAuth,
    redirectIfAuthed: redirectIfAuthed,
    dashboardUrl: dashboardUrl,

    signIn: function (email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password });
    },

    signOut: async function () {
      await sb.auth.signOut();
      window.location.href = 'login.html';
    },

    sendPasswordReset: function (email) {
      var base = window.location.href.replace(/\/[^\/]*$/, '');
      return sb.auth.resetPasswordForEmail(email, {
        redirectTo: base + '/reset-password.html'
      });
    },

    updatePassword: function (password) {
      return sb.auth.updateUser({ password: password });
    },

    updateProfile: async function (data) {
      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) return { error: { message: 'Not authenticated' } };
      return sb.from('profiles').update(data).eq('id', session.user.id);
    },

    // Send an invite — calls our server-side API function
    // firmId is optional; required when called by super_admin for a specific firm
    sendInvite: async function (email, role, firmId) {
      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) return { error: 'Not authenticated' };
      var body = { email: email, role: role || 'lawyer' };
      if (firmId) body.firmId = firmId;
      var resp = await fetch('api/invite.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify(body)
      });
      var json = await resp.json();
      // Normalize error shape: { error: string } for callers
      if (!resp.ok && json.error === undefined) json.error = 'Invite failed';
      return json;
    },

    logAudit: async function (action, resource_type, resource_id, old_data, new_data) {
      try {
        var res = await sb.auth.getSession();
        var session = res.data && res.data.session;
        if (!session) return;
        var profile = await getProfile();
        return sb.from('audit_log').insert({
          firm_id:       profile ? profile.firm_id : null,
          actor_id:      session.user.id,
          action:        action,
          resource_type: resource_type || null,
          resource_id:   resource_id   || null,
          old_data:      old_data      || null,
          new_data:      new_data      || null
        });
      } catch (_) { /* non-critical, swallow */ }
    }
  };

  // ── Auto-apply guards via data-page attribute ─────────────────────
  var page = document.body && document.body.dataset && document.body.dataset.page;
  if (page === 'auth-required') requireAuth();
  if (page === 'auth-page')     redirectIfAuthed();

})();

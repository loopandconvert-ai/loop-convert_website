(function () {
  var cfg = window.LC_CONFIG;
  if (!cfg || cfg.supabaseUrl === 'YOUR_SUPABASE_URL') return;

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  window.LC_SUPABASE = sb;

  // ── Update nav based on session ───────────────────────────
  function applyAuthNav(session) {
    var link = document.getElementById('nav-auth-link');
    var mlink = document.getElementById('mob-auth-link');
    if (!link) return;
    if (session) {
      link.textContent  = 'Dashboard';
      link.href         = 'dashboard.html';
      if (mlink) { mlink.textContent = 'Dashboard'; mlink.href = 'dashboard.html'; }
    } else {
      link.textContent  = 'Log In';
      link.href         = 'login.html';
      if (mlink) { mlink.textContent = 'Log In'; mlink.href = 'login.html'; }
    }
  }

  // ── Guard: redirect to login if page requires auth ───────
  function requireAuth(session) {
    if (!session) {
      var next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = 'login.html?next=' + next;
    }
  }

  // ── Guard: redirect logged-in users away from auth pages ─
  function redirectIfAuthed(session, dest) {
    if (session) window.location.href = dest || 'dashboard.html';
  }

  sb.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    applyAuthNav(session);

    var page = document.body.dataset.page;
    if (page === 'auth-required')  requireAuth(session);
    if (page === 'auth-page')      redirectIfAuthed(session);

    // Auto-join any pending workspace invites for this user
    if (session) {
      window.LC_AUTH && window.LC_AUTH.checkAndJoinPendingInvites &&
        window.LC_AUTH.checkAndJoinPendingInvites(session.user.email, session.user.id);
    }

    // expose for inline scripts
    window.LC_SESSION = session;
    document.dispatchEvent(new CustomEvent('lc:session', { detail: session }));
  });

  // ── Auth helpers ──────────────────────────────────────────
  window.LC_AUTH = {
    supabase: sb,

    signUp: function (email, password, fullName) {
      return sb.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      });
    },

    signIn: function (email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password });
    },

    signOut: function () {
      return sb.auth.signOut().then(function () {
        window.location.href = 'login.html';
      });
    },

    saveAnalysis: function (payload) {
      return sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) return Promise.reject('not authenticated');
        var row = {
          user_id:       session.user.id,
          file_name:     payload.file_name,
          risk_level:    payload.risk_level,
          analyzed_at:   payload.analyzed_at || new Date().toISOString(),
          analysis_data: payload.analysis_data
        };
        if (payload.workspace_id) row.workspace_id = payload.workspace_id;
        return sb.from('analyses').insert(row).select();
      });
    },

    loadAnalyses: function () {
      return sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) return { data: [], error: null };
        return sb.from('analyses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('analyzed_at', { ascending: false });
      });
    },

    getAnalysisById: function (id) {
      return sb.from('analyses').select('*').eq('id', id).single();
    },

    // ── Workspace / Team ──────────────────────────────────────

    createWorkspace: function (firmName) {
      return sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) return Promise.reject('not authenticated');
        var userId = session.user.id;
        var email  = session.user.email;
        return sb.from('workspaces').insert({
          name:     firmName,
          owner_id: userId
        }).select().then(function (r) {
          if (r.error) return r;
          var wsId = r.data[0].id;
          return sb.from('workspace_members').insert({
            workspace_id: wsId,
            user_id:      userId,
            email:        email,
            role:         'owner',
            status:       'active',
            joined_at:    new Date().toISOString()
          });
        });
      });
    },

    checkAndJoinPendingInvites: function (email, userId) {
      return sb.from('workspace_members')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .then(function (res) {
          if (res.error || !res.data || res.data.length === 0) return;
          var ids = res.data.map(function (r) { return r.id; });
          return sb.from('workspace_members')
            .update({
              user_id:   userId,
              status:    'active',
              joined_at: new Date().toISOString()
            })
            .in('id', ids);
        });
    },

    getMyWorkspace: function () {
      return sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) return { data: null };
        return sb.from('workspaces')
          .select('*')
          .eq('owner_id', session.user.id)
          .maybeSingle();
      });
    },

    getMyMembership: function () {
      return sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) return { data: null };
        return sb.from('workspace_members')
          .select('*, workspaces(id, name, owner_id)')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();
      });
    },

    addWorkspaceMember: function (email, workspaceId) {
      return sb.from('workspace_members').insert({
        workspace_id: workspaceId,
        email:        email,
        role:         'member',
        status:       'pending'
      });
    },

    removeWorkspaceMember: function (memberId) {
      return sb.from('workspace_members').delete().eq('id', memberId);
    },

    loadWorkspaceMembers: function (workspaceId) {
      return sb.from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('invited_at', { ascending: true });
    },

    loadWorkspaceAnalyses: function (workspaceId) {
      return sb.from('analyses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('analyzed_at', { ascending: false })
        .then(function (res) {
          if (res.error || !res.data) return res;
          // Enrich each row with uploader email from workspace_members
          return sb.from('workspace_members')
            .select('user_id, email')
            .eq('workspace_id', workspaceId)
            .then(function (mRes) {
              var memberMap = {};
              (mRes.data || []).forEach(function (m) {
                if (m.user_id) memberMap[m.user_id] = m.email;
              });
              res.data = res.data.map(function (a) {
                a.uploader_email = memberMap[a.user_id] || null;
                return a;
              });
              return res;
            });
        });
    }
  };
})();

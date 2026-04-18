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
        return sb.from('analyses').insert({
          user_id:       session.user.id,
          file_name:     payload.fileName,
          risk_level:    payload.riskLevel,
          analyzed_at:   payload.analyzedAt || new Date().toISOString(),
          analysis_data: payload
        });
      });
    },

    loadAnalyses: function () {
      return sb.from('analyses')
        .select('*')
        .order('analyzed_at', { ascending: false });
    },

    getAnalysisById: function (id) {
      return sb.from('analyses').select('*').eq('id', id).single();
    }
  };
})();

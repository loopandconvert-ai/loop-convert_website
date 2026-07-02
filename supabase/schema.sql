-- ═══════════════════════════════════════════════════════════════════
--  Loop & Convert — Database Schema + RLS
--  Run ONCE in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── ENUM types ──────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('super_admin', 'firm_admin', 'lawyer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.user_status AS ENUM ('active', 'invited', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.contract_status AS ENUM ('uploaded', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── firms ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.firms (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  subscription_tier TEXT        NOT NULL DEFAULT 'starter',
  seat_limit        INTEGER     NOT NULL DEFAULT 5,
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── profiles (1-to-1 with auth.users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID              PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id     UUID              REFERENCES public.firms(id) ON DELETE SET NULL,
  role        public.user_role  NOT NULL DEFAULT 'lawyer',
  full_name   TEXT              NOT NULL DEFAULT '',
  email       TEXT              NOT NULL,
  status      public.user_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── contracts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id            UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID                   NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  uploaded_by   UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name     TEXT                   NOT NULL,
  storage_path  TEXT                   NOT NULL,
  contract_type TEXT,
  status        public.contract_status NOT NULL DEFAULT 'uploaded',
  created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

-- ── analyses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analyses (
  id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id        UUID             NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  overall_risk_score INTEGER          CHECK (overall_risk_score BETWEEN 0 AND 100),
  risk_level         public.risk_level,
  executive_summary  TEXT,
  model_version      TEXT,
  processing_ms      INTEGER,
  raw_json           JSONB,
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ── risk_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risk_items (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id    UUID             NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  category       TEXT             NOT NULL,
  severity       public.risk_level NOT NULL,
  clause_excerpt TEXT,
  page_number    INTEGER,
  explanation    TEXT,
  recommendation TEXT
);

-- ── invitations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID                     NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  email       TEXT                     NOT NULL,
  role        public.user_role         NOT NULL DEFAULT 'lawyer',
  token       TEXT                     NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID                     REFERENCES public.profiles(id) ON DELETE SET NULL,
  status      public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at  TIMESTAMPTZ              NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

-- ── audit_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID        REFERENCES public.firms(id) ON DELETE SET NULL,
  actor_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  resource_type TEXT,
  resource_id   UUID,
  old_data      JSONB,
  new_data      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Performance indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_firm_id      ON public.profiles(firm_id);
CREATE INDEX IF NOT EXISTS idx_contracts_firm_id     ON public.contracts(firm_id);
CREATE INDEX IF NOT EXISTS idx_analyses_contract_id  ON public.analyses(contract_id);
CREATE INDEX IF NOT EXISTS idx_risk_items_analysis   ON public.risk_items(analysis_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email     ON public.invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_token     ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_audit_log_firm        ON public.audit_log(firm_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.firms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log   ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ─────────────────────────────────────────────────
-- SECURITY DEFINER + explicit search_path prevents privilege-escalation attacks.
-- These run as the function owner (superuser) so they bypass RLS on profiles,
-- which lets them return the correct firm_id and role for any auth.uid().

CREATE OR REPLACE FUNCTION public.my_firm_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT firm_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── firms policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin: all firms"   ON public.firms;
DROP POLICY IF EXISTS "members: read own firm"   ON public.firms;

CREATE POLICY "super_admin: all firms" ON public.firms
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "members: read own firm" ON public.firms
  FOR SELECT TO authenticated
  USING (id = public.my_firm_id());

-- ── profiles policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin: all profiles"         ON public.profiles;
DROP POLICY IF EXISTS "firm_admin: manage firm profiles"  ON public.profiles;
DROP POLICY IF EXISTS "user: own profile"                 ON public.profiles;

CREATE POLICY "super_admin: all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "firm_admin: manage firm profiles" ON public.profiles
  FOR ALL TO authenticated
  USING     (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin')
  WITH CHECK (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin');

CREATE POLICY "user: own profile" ON public.profiles
  FOR ALL TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── contracts policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin: all contracts"          ON public.contracts;
DROP POLICY IF EXISTS "firm_admin: manage firm contracts"   ON public.contracts;
DROP POLICY IF EXISTS "lawyer: access firm contracts"       ON public.contracts;

CREATE POLICY "super_admin: all contracts" ON public.contracts
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "firm_admin: manage firm contracts" ON public.contracts
  FOR ALL TO authenticated
  USING     (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin')
  WITH CHECK (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin');

CREATE POLICY "lawyer: access firm contracts" ON public.contracts
  FOR ALL TO authenticated
  USING     (firm_id = public.my_firm_id() AND public.my_role() = 'lawyer')
  WITH CHECK (firm_id = public.my_firm_id() AND public.my_role() = 'lawyer');

-- ── analyses policies ─────────────────────────────────────────────────
-- INSERT is done by the Edge Function via service role key (bypasses RLS).
DROP POLICY IF EXISTS "super_admin: all analyses"     ON public.analyses;
DROP POLICY IF EXISTS "firm members: read analyses"   ON public.analyses;

CREATE POLICY "super_admin: all analyses" ON public.analyses
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "firm members: read analyses" ON public.analyses
  FOR SELECT TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM public.contracts WHERE firm_id = public.my_firm_id()
    )
  );

-- ── risk_items policies ───────────────────────────────────────────────
-- INSERT is done by the Edge Function via service role key (bypasses RLS).
DROP POLICY IF EXISTS "super_admin: all risk_items"     ON public.risk_items;
DROP POLICY IF EXISTS "firm members: read risk_items"   ON public.risk_items;

CREATE POLICY "super_admin: all risk_items" ON public.risk_items
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "firm members: read risk_items" ON public.risk_items
  FOR SELECT TO authenticated
  USING (
    analysis_id IN (
      SELECT a.id FROM public.analyses a
      JOIN public.contracts c ON a.contract_id = c.id
      WHERE c.firm_id = public.my_firm_id()
    )
  );

-- ── invitations policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin: all invitations"          ON public.invitations;
DROP POLICY IF EXISTS "firm_admin: manage firm invitations"   ON public.invitations;
DROP POLICY IF EXISTS "anon: read pending invitation by token" ON public.invitations;

CREATE POLICY "super_admin: all invitations" ON public.invitations
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "firm_admin: manage firm invitations" ON public.invitations
  FOR ALL TO authenticated
  USING     (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin')
  WITH CHECK (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin');

-- Anon SELECT so the invite-accept page can validate the token before sign-up
CREATE POLICY "anon: read pending invitation by token" ON public.invitations
  FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > NOW());

-- ── audit_log policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin: all audit_log"           ON public.audit_log;
DROP POLICY IF EXISTS "firm_admin: read firm audit_log"      ON public.audit_log;
DROP POLICY IF EXISTS "authenticated: insert own firm audit" ON public.audit_log;

CREATE POLICY "super_admin: all audit_log" ON public.audit_log
  FOR ALL TO authenticated
  USING     (public.my_role() = 'super_admin')
  WITH CHECK (public.my_role() = 'super_admin');

CREATE POLICY "firm_admin: read firm audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (firm_id = public.my_firm_id() AND public.my_role() = 'firm_admin');

CREATE POLICY "authenticated: insert own firm audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.my_firm_id());


-- ═══════════════════════════════════════════════════════════════════
--  Trigger: create profile automatically when an invited user signs up
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite public.invitations%ROWTYPE;
BEGIN
  -- Super admin: provisioned explicitly with role metadata
  IF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
    INSERT INTO public.profiles (id, email, role, full_name, status)
    VALUES (
      NEW.id,
      NEW.email,
      'super_admin',
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'active'
    );
    RETURN NEW;
  END IF;

  -- Find the most recent valid invitation for this email
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE email   = NEW.email
    AND status  = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.profiles (id, email, firm_id, role, full_name, status)
    VALUES (
      NEW.id,
      NEW.email,
      v_invite.firm_id,
      v_invite.role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'active'
    );
    UPDATE public.invitations SET status = 'accepted' WHERE id = v_invite.id;
  END IF;
  -- No invitation and not super_admin → no profile → no access.

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════
--  Storage bucket + policies
--  Files are stored as: {firm_id}/{contract_id}/{original_filename}
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "firm members: upload contracts"  ON storage.objects;
DROP POLICY IF EXISTS "firm members: read contracts"    ON storage.objects;
DROP POLICY IF EXISTS "firm admins: delete contracts"   ON storage.objects;
DROP POLICY IF EXISTS "super_admin: all storage"        ON storage.objects;

-- Upload: authenticated user's firm must own the top-level folder
CREATE POLICY "firm members: upload contracts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = public.my_firm_id()::text
  );

-- Read: same folder ownership check
CREATE POLICY "firm members: read contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = public.my_firm_id()::text
  );

-- Delete: firm_admin or super_admin only
CREATE POLICY "firm admins: delete contracts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = public.my_firm_id()::text
    AND public.my_role() IN ('firm_admin', 'super_admin')
  );

CREATE POLICY "super_admin: all storage" ON storage.objects
  FOR ALL TO authenticated
  USING     (bucket_id = 'contracts' AND public.my_role() = 'super_admin')
  WITH CHECK (bucket_id = 'contracts' AND public.my_role() = 'super_admin');

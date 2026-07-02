-- ═══════════════════════════════════════════════════════════════
--  Phase 3 Migration — run in Supabase SQL Editor
--  Adds structured columns to audit_log so the Activity tab works
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS resource_id   UUID,
  ADD COLUMN IF NOT EXISTS old_data      JSONB,
  ADD COLUMN IF NOT EXISTS new_data      JSONB;

-- Drop the old free-text target column (safe — nothing in Phase 3 reads it)
ALTER TABLE public.audit_log DROP COLUMN IF EXISTS target;

-- Refresh the index to include new column layout
DROP INDEX IF EXISTS idx_audit_log_firm;
CREATE INDEX IF NOT EXISTS idx_audit_log_firm ON public.audit_log(firm_id, created_at DESC);

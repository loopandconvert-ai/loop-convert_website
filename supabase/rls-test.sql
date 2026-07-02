-- ═══════════════════════════════════════════════════════════════════
--  RLS Isolation Test
--  Run in Supabase SQL Editor AFTER Phase 2 (once you have real users)
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Find your test users and their firms
SELECT
  p.id        AS profile_id,
  p.email,
  p.role,
  p.firm_id,
  f.name      AS firm_name
FROM public.profiles p
JOIN public.firms f ON p.firm_id = f.id
ORDER BY f.name, p.email;

-- Step 2: Paste the UUIDs from Step 1 into the block below, then run it.
DO $$
DECLARE
  user_a_id UUID := 'REPLACE_WITH_LAWYER_FROM_FIRM_A';  -- a lawyer in Firm A
  firm_b_id UUID := 'REPLACE_WITH_FIRM_B_ID';            -- Firm B's id
  v_count   INTEGER;
BEGIN
  -- Simulate being user A
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE TO authenticated;

  -- Try to read Firm B's contracts (should return 0)
  SELECT COUNT(*) INTO v_count
  FROM public.contracts
  WHERE firm_id = firm_b_id;

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS contracts: Firm A user sees 0 rows from Firm B (count = %)', v_count;
  ELSE
    RAISE WARNING 'FAIL contracts: Firm A user can read % rows from Firm B!', v_count;
  END IF;

  -- Try to read Firm B's analyses
  SELECT COUNT(*) INTO v_count
  FROM public.analyses
  WHERE contract_id IN (
    SELECT id FROM public.contracts WHERE firm_id = firm_b_id
  );

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS analyses: Firm A user sees 0 rows from Firm B (count = %)', v_count;
  ELSE
    RAISE WARNING 'FAIL analyses: Firm A user can read % analyses from Firm B!', v_count;
  END IF;

END $$;

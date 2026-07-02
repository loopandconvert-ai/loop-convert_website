-- Phase 5: Add extracted_text column to contracts for AI chat context
-- Run this in the Supabase SQL Editor

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS extracted_text TEXT;

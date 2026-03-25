-- ============================================
-- Migration v22: Survey assignment flag
-- Run this in Supabase SQL Editor
-- ============================================

-- Add survey_required flag to profiles.
-- Default false — new members are never auto-gated.
-- Admin explicitly assigns the survey to specific users.
alter table public.profiles
  add column if not exists survey_required boolean not null default false;

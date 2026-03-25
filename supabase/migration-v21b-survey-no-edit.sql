-- ============================================
-- Migration v21b: Make survey responses immutable
-- Users can submit once but cannot edit after
-- ============================================

drop policy if exists "Users can update own survey response" on public.survey_responses;

-- ============================================
-- Migration v24: Allow admins to delete survey responses
-- Run this in Supabase SQL Editor
-- ============================================

create policy "Admins can delete survey responses"
  on public.survey_responses for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

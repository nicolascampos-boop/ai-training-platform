-- ============================================
-- Migration v21: Satisfaction Survey
-- Run this in Supabase SQL Editor
-- ============================================

create table if not exists public.survey_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,

  -- Ratings (1-5) for each area
  rating_monday_sessions int check (rating_monday_sessions between 1 and 5),
  rating_deliverables    int check (rating_deliverables between 1 and 5),
  rating_material        int check (rating_material between 1 and 5),
  rating_resources       int check (rating_resources between 1 and 5),
  rating_overall         int check (rating_overall between 1 and 5),

  -- Optional free-text per rating category
  feedback_monday_sessions text,
  feedback_deliverables    text,
  feedback_material        text,
  feedback_resources       text,
  feedback_overall         text,

  -- Open-ended exploration questions
  wants_to_dig_deeper   text,
  wants_to_explore      text,
  feels_confident_about text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

-- Users can submit/update their own response
create policy "Users can insert own survey response"
  on public.survey_responses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own survey response"
  on public.survey_responses for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view own survey response"
  on public.survey_responses for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins can view all responses
create policy "Admins can view all survey responses"
  on public.survey_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

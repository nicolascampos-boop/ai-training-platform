-- ============================================
-- Migration v23: Multi-round survey support
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create surveys table to track each engagement survey round
create table if not exists public.surveys (
  id          uuid default gen_random_uuid() primary key,
  title       text not null default 'Engagement Survey',
  is_active   boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.surveys enable row level security;

create policy "Admins can manage surveys"
  on public.surveys for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Users can view active surveys"
  on public.surveys for select
  to authenticated
  using (is_active = true);

-- 2. Add survey_id to survey_responses
alter table public.survey_responses
  add column if not exists survey_id uuid references public.surveys(id) on delete cascade;

-- 3. Seed the first survey round and link any existing responses to it
insert into public.surveys (title, is_active)
values ('Engagement Survey #1', true);

-- Link existing responses (if any) to the first survey
update public.survey_responses
set survey_id = (select id from public.surveys where title = 'Engagement Survey #1' limit 1)
where survey_id is null;

-- 4. Drop the old unique constraint (one response per user ever)
--    and replace with one response per user per survey round
alter table public.survey_responses
  drop constraint if exists survey_responses_user_id_key;

alter table public.survey_responses
  add constraint survey_responses_user_id_survey_id_key unique (user_id, survey_id);

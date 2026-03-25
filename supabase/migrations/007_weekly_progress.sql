-- ============================================================
-- Weekly Progress Tracking
-- Unified view of process + engagement per user per week
-- ============================================================

CREATE TABLE public.weekly_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 6),
  material_opened BOOLEAN NOT NULL DEFAULT false,
  comment_left BOOLEAN NOT NULL DEFAULT false,
  score_given BOOLEAN NOT NULL DEFAULT false,
  delivered BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_number)
);

ALTER TABLE public.weekly_progress ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage weekly progress"
  ON public.weekly_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
  ON public.weekly_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_progress_user_id ON public.weekly_progress(user_id);
CREATE INDEX idx_weekly_progress_week ON public.weekly_progress(week_number);

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface SurveyPayload {
  rating_monday_sessions: number
  rating_deliverables: number
  rating_material: number
  rating_resources: number
  rating_overall: number
  feedback_monday_sessions: string
  feedback_deliverables: string
  feedback_material: string
  feedback_resources: string
  feedback_overall: string
  wants_to_dig_deeper: string
  wants_to_explore: string
  feels_confident_about: string
}

export async function submitSurvey(payload: SurveyPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('survey_responses')
    .upsert(
      { user_id: user.id, ...payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }

  redirect('/dashboard')
}

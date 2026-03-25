'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface SurveyPayload {
  survey_id: string
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
    .insert({ user_id: user.id, ...payload })

  // Ignore duplicate key — already submitted
  if (error && error.code !== '23505') return { error: error.message }

  redirect('/dashboard')
}

// ─── Admin: create a new survey round ────────────────────────────────────────
export async function createSurveyRound(title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Admin access required' }

  // Deactivate any currently active survey
  await supabase.from('surveys').update({ is_active: false }).eq('is_active', true)

  // Create the new active survey
  const { data, error } = await supabase
    .from('surveys')
    .insert({ title, is_active: true, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true, survey: data }
}

// ─── Admin: set a specific round as the active one ───────────────────────────
export async function setActiveSurvey(surveyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Admin access required' }

  await supabase.from('surveys').update({ is_active: false }).eq('is_active', true)
  const { error } = await supabase.from('surveys').update({ is_active: true }).eq('id', surveyId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// ─── Admin: assign/unassign survey requirement to specific users ──────────────
export async function assignSurvey(userIds: string[], required: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Admin access required' }

  const { error } = await supabase
    .from('profiles')
    .update({ survey_required: required })
    .in('id', userIds)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// ─── Admin: delete a survey response so a user can retake it ─────────────────
export async function deleteSurveyResponse(userId: string, surveyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Admin access required' }

  const { error } = await supabase
    .from('survey_responses')
    .delete()
    .eq('user_id', userId)
    .eq('survey_id', surveyId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

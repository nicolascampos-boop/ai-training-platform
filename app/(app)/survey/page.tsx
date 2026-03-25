import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SurveyForm from '@/components/survey-form'

export default async function SurveyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Find the active survey round
  const { data: activeSurvey } = await supabase
    .from('surveys')
    .select('id, title')
    .eq('is_active', true)
    .single()

  // No active survey — nothing to fill out
  if (!activeSurvey) redirect('/dashboard')

  // Already completed this round — skip to dashboard
  const { data: existing } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('user_id', user.id)
    .eq('survey_id', activeSurvey.id)
    .single()

  if (existing) redirect('/dashboard')

  return (
    <div className="min-h-screen py-8 px-4">
      <SurveyForm surveyId={activeSurvey.id} surveyTitle={activeSurvey.title} />
    </div>
  )
}

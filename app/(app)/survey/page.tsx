import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SurveyForm from '@/components/survey-form'

export default async function SurveyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If already completed, send them to the dashboard
  const { data: existing } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) redirect('/dashboard')

  return (
    <div className="min-h-screen py-8 px-4">
      <SurveyForm />
    </div>
  )
}

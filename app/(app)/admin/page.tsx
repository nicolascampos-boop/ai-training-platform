import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from '@/components/admin-panel'
import { getOrphanedAuthUsers } from '@/lib/actions/profiles'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all materials with scores
  const { data: materials } = await supabase
    .from('material_scores')
    .select('*')
    .order('created_at', { ascending: false })

  // Progress tracking data + engagement views + orphaned auth users + survey rounds (all in parallel)
  const [
    { data: progressMaterials },
    { data: allVotes },
    { data: allDeliverables },
    { data: allViews },
    { data: allSessions },
    { orphaned: orphanedUsers },
    { data: surveyResponses },
    { data: surveys },
  ] = await Promise.all([
    supabase.from('materials').select('id, week, material_tier, title').not('week', 'is', null),
    supabase.from('votes').select('user_id, material_id, comment, quality_score, relevance_score'),
    supabase.from('week_deliverables').select('user_id, week, link, notes, submitted_at'),
    supabase.from('material_views').select('user_id, material_id, material_week, source, viewed_at'),
    supabase.from('week_sessions').select('week, title, link, session_type'),
    getOrphanedAuthUsers(),
    supabase
      .from('survey_responses')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('surveys')
      .select('id, title, is_active, created_at')
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-muted mt-1">Manage users and materials</p>
      </div>

      <AdminPanel
        users={users || []}
        materials={materials || []}
        orphanedUsers={orphanedUsers || []}
        progressData={{
          materials: progressMaterials || [],
          votes: allVotes || [],
          deliverables: allDeliverables || [],
          sessions: allSessions || [],
        }}
        engagementData={{
          views: allViews || [],
        }}
        surveyResponses={surveyResponses || []}
        surveys={surveys || []}
      />
    </div>
  )
}

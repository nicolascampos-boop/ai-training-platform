import { createClient } from '@/lib/supabase/server'
import MaterialCard from '@/components/material-card'
import Link from 'next/link'
import { WEEKS, WEEK_DESCRIPTIONS } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get profile for greeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // Helper: normalize tier strings
  const normalizeTier = (tier: string | null | undefined): string => {
    if (!tier) return ''
    return tier.toLowerCase().replace(/[\s_-]+/g, '')
  }

  // Parallel data fetch
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [
    { data: allMaterialsWeeks },
    { data: userVotes },
    { data: userDeliverables },
    { data: userViews },
    { count: totalMaterials },
    { data: recentVotes },
    { data: topRated },
    { data: mySurvey },
  ] = await Promise.all([
    supabase.from('materials').select('id, week, material_tier, title').not('week', 'is', null),
    supabase.from('votes').select('material_id').eq('user_id', user!.id),
    supabase.from('week_deliverables').select('week').eq('user_id', user!.id),
    supabase.from('material_views').select('material_id').eq('user_id', user!.id),
    supabase.from('materials').select('*', { count: 'exact', head: true }),
    supabase.from('votes').select('material_id, created_at').gte('created_at', weekAgo.toISOString()).order('created_at', { ascending: false }),
    supabase.from('material_scores').select('*').gt('vote_count', 0).order('avg_overall', { ascending: false }).limit(8),
    supabase.from('survey_responses').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const userReviewedIds = new Set((userVotes ?? []).map(v => v.material_id))
  const userViewedIds = new Set((userViews ?? []).map(v => v.material_id))
  const submittedWeeks = new Set((userDeliverables ?? []).map(d => d.week))

  // ─── Per-week progress ─────────────────────────────────────────────────────
  const weekProgress = WEEKS.map(week => {
    const weekMaterials = (allMaterialsWeeks ?? []).filter(m => m.week === week)
    const requiredMaterials = weekMaterials.filter(m => {
      const t = normalizeTier(m.material_tier)
      return t === 'mustread' || t === 'core'
    })
    const total = requiredMaterials.length
    const opened = requiredMaterials.filter(m => userViewedIds.has(m.id)).length
    const reviewed = requiredMaterials.filter(m => userReviewedIds.has(m.id)).length
    const hasDeliverable = submittedWeeks.has(week)
    const readingPct = total > 0 ? (reviewed / total) * 60 : 0
    const deliverablePct = hasDeliverable ? 40 : 0
    const pct = Math.round(readingPct + deliverablePct)
    const complete = total > 0 && reviewed === total && hasDeliverable
    return { week, total, opened, reviewed, pct, hasDeliverable, complete }
  }).filter(w => w.total > 0)

  // Overall stats
  const totalRequired = weekProgress.reduce((sum, w) => sum + w.total, 0)
  const totalReviewed = weekProgress.reduce((sum, w) => sum + w.reviewed, 0)
  const totalOpened = weekProgress.reduce((sum, w) => sum + w.opened, 0)
  const overallPct = totalRequired > 0 ? Math.round((totalReviewed / totalRequired) * 100) : 0
  const completedWeeks = weekProgress.filter(w => w.complete).length

  // ─── Current week (first incomplete, or last) ─────────────────────────────
  const currentWeekData = weekProgress.find(w => !w.complete) || weekProgress[weekProgress.length - 1]

  // ─── Unified activity feed (trending + top rated, deduplicated) ────────────
  const weeklyVoteCounts = (recentVotes || []).reduce((acc, vote) => {
    acc[vote.material_id] = (acc[vote.material_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const trendingIds = Object.entries(weeklyVoteCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id)

  const { data: trendingMaterials } = trendingIds.length > 0
    ? await supabase.from('material_scores').select('*').in('id', trendingIds)
    : { data: null }

  const trendingSorted = trendingMaterials?.sort((a, b) =>
    (weeklyVoteCounts[b.id] || 0) - (weeklyVoteCounts[a.id] || 0)
  ) || []

  // Merge trending + top rated, no duplicates
  const seenIds = new Set<string>()
  type ScoredMaterial = NonNullable<typeof topRated>[number]
  const activityFeed: { material: ScoredMaterial; badge: string }[] = []

  for (const m of trendingSorted) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id)
      activityFeed.push({ material: m, badge: 'Trending' })
    }
  }
  for (const m of (topRated || [])) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id)
      activityFeed.push({ material: m, badge: 'Top Rated' })
    }
  }

  return (
    <div className="max-w-5xl">
      {/* ─── Header with inline stats ─────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">
            <span className="font-bold">{overallPct}%</span> progress
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded-full">
            <span className="font-bold">{totalReviewed}/{totalRequired}</span> reviewed
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 font-medium px-2.5 py-1 rounded-full">
            <span className="font-bold">{completedWeeks}/{weekProgress.length}</span> weeks done
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
            <span className="font-bold">{totalMaterials || 0}</span> total materials
          </span>
        </div>
      </div>

      {/* ─── Current Week Focus Card ──────────────────────────────────────── */}
      {currentWeekData && (
        <Link
          href={`/weekly?week=${encodeURIComponent(currentWeekData.week)}`}
          className="block mb-6 bg-card rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary uppercase tracking-wide">Current Week</p>
              <p className="text-lg font-semibold text-gray-900 mt-0.5">{currentWeekData.week}</p>
              <p className="text-sm text-muted">{WEEK_DESCRIPTIONS[currentWeekData.week]}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted">
                <span>{currentWeekData.opened}/{currentWeekData.total} opened</span>
                <span>{currentWeekData.reviewed}/{currentWeekData.total} reviewed</span>
                {currentWeekData.hasDeliverable
                  ? <span className="text-green-600 font-medium">Deliverable submitted</span>
                  : <span className="text-amber-600 font-medium">Deliverable pending</span>
                }
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={currentWeekData.complete ? '#22c55e' : '#4F46E5'} strokeWidth="4" strokeDasharray={`${(currentWeekData.pct / 100) * 150.8} 150.8`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">{currentWeekData.pct}%</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${currentWeekData.complete ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${currentWeekData.pct}%` }} />
            </div>
          </div>
        </Link>
      )}

      {/* ─── Progress Timeline ────────────────────────────────────────────── */}
      {weekProgress.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Your Progress</h2>
            <Link href="/weekly" className="text-xs text-primary hover:text-primary-dark font-medium">
              View all weeks
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {weekProgress.map(({ week, pct, complete, reviewed, total }) => (
              <Link
                key={week}
                href={`/weekly?week=${encodeURIComponent(week)}`}
                className={`group relative flex flex-col items-center px-3 py-2 rounded-lg border transition-all hover:shadow-sm ${
                  complete
                    ? 'bg-green-50 border-green-200 hover:border-green-300'
                    : pct > 0
                    ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
                title={`${week}: ${reviewed}/${total} reviewed, ${pct}%`}
              >
                <span className="text-[10px] font-medium text-muted">{week.replace('Week ', 'W')}</span>
                <span className={`text-xs font-bold mt-0.5 ${
                  complete ? 'text-green-700' : pct > 0 ? 'text-amber-700' : 'text-gray-400'
                }`}>
                  {complete ? '100%' : `${pct}%`}
                </span>
                <div className="w-8 bg-gray-200 rounded-full h-1 mt-1">
                  <div className={`h-1 rounded-full ${complete ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`} style={{ width: `${pct}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── Quick Links ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/weekly" className="text-xs font-medium text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
          This Week&apos;s Training
        </Link>
        <Link href="/library" className="text-xs font-medium text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
          Browse Library
        </Link>
        <Link href="/library?score_filter=none" className="text-xs font-medium text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
          Review Unscored
        </Link>
        <Link href="/upload" className="text-xs font-medium text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
          Upload Material
        </Link>
      </div>

      {/* ─── My Survey Response (read-only) ───────────────────────────────── */}
      {mySurvey && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">My Survey Response</h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <p className="text-xs text-muted">
              Submitted on {new Date(mySurvey.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {/* Ratings + comments per category */}
            <div className="space-y-2">
              {([
                { label: 'Monday Sessions', rating: mySurvey.rating_monday_sessions, comment: mySurvey.feedback_monday_sessions },
                { label: 'Deliverables',    rating: mySurvey.rating_deliverables,    comment: mySurvey.feedback_deliverables },
                { label: 'Material',        rating: mySurvey.rating_material,        comment: mySurvey.feedback_material },
                { label: 'Resources',       rating: mySurvey.rating_resources,       comment: mySurvey.feedback_resources },
                { label: 'Overall',         rating: mySurvey.rating_overall,         comment: mySurvey.feedback_overall },
              ] as const).map(item => (
                <div key={item.label} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="w-28 shrink-0">
                    <p className="text-[10px] font-semibold text-gray-500">{item.label}</p>
                    <p className="text-yellow-500 text-sm leading-none mt-0.5">
                      {'★'.repeat(item.rating ?? 0)}<span className="text-gray-200">{'★'.repeat(5 - (item.rating ?? 0))}</span>
                    </p>
                  </div>
                  {item.comment ? (
                    <p className="text-xs text-gray-600 italic flex-1">&ldquo;{item.comment}&rdquo;</p>
                  ) : (
                    <p className="text-xs text-gray-300 flex-1">No written comment</p>
                  )}
                </div>
              ))}
            </div>
            {/* Open-ended answers */}
            {(mySurvey.wants_to_dig_deeper || mySurvey.wants_to_explore || mySurvey.feels_confident_about) && (
              <div className="border-t border-border pt-3 space-y-2">
                {([
                  { label: 'Wants to explore in greater depth', value: mySurvey.wants_to_dig_deeper },
                  { label: 'Wants the program to incorporate',  value: mySurvey.wants_to_explore },
                  { label: 'Feels most improved in',            value: mySurvey.feels_confident_about },
                ] as const).filter(item => item.value).map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{item.label}</p>
                    <p className="text-xs text-gray-700 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Activity Feed ────────────────────────────────────────────────── */}
      {activityFeed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Featured Materials</h2>
            <Link href="/library?sort=top_rated" className="text-xs text-primary hover:text-primary-dark font-medium">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {activityFeed.slice(0, 6).map(({ material, badge }) => (
              <div key={material.id} className="relative">
                <span className={`absolute -left-1 top-3 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-r-md ${
                  badge === 'Trending'
                    ? 'bg-orange-500 text-white'
                    : 'bg-yellow-400 text-yellow-900'
                }`}>
                  {badge}
                </span>
                <MaterialCard material={material} from="dashboard" isReviewed={userReviewedIds.has(material.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

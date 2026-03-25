'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteUser, updateUserRole, createMissingProfile } from '@/lib/actions/profiles'
import { adminRecordView, adminRemoveViews, adminUpsertVote, adminRemoveVote, adminUpsertDeliverable, adminRemoveDeliverable } from '@/lib/actions/admin-progress'
import type { OrphanedUser } from '@/lib/actions/profiles'
import type { Profile, MaterialWithScores } from '@/lib/supabase/types'
import { WEEKS } from '@/lib/supabase/types'
import AdminSurveyTab, { type SurveyResponseWithProfile, type UserForSurvey, type SurveyRound } from '@/components/admin-survey-tab'

interface ProgressRawData {
  materials: { id: string; week: string | null; material_tier: string | null; title?: string | null }[]
  votes: { user_id: string; material_id: string; comment: string | null; quality_score: number; relevance_score: number }[]
  deliverables: { user_id: string; week: string; link: string | null; notes: string | null; submitted_at: string }[]
  sessions: { week: string; title: string; link: string; session_type: string }[]
}

interface ViewRecord {
  user_id: string
  material_id: string
  material_week: string | null
  source: string
  viewed_at: string
}

interface AdminPanelProps {
  users: Profile[]
  materials: MaterialWithScores[]
  orphanedUsers: OrphanedUser[]
  progressData: ProgressRawData
  engagementData: { views: ViewRecord[] }
  surveyResponses: SurveyResponseWithProfile[]
  surveys: SurveyRound[]
}

export default function AdminPanel({ users, materials, orphanedUsers, progressData, engagementData, surveyResponses, surveys }: AdminPanelProps) {
  const [tab, setTab] = useState<'users' | 'materials' | 'progress' | 'engagement' | 'survey'>('users')

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'users' ? 'bg-white shadow text-gray-900' : 'text-muted hover:text-gray-700'
          }`}
        >
          Users ({users.length})
          {orphanedUsers.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {orphanedUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('materials')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'materials' ? 'bg-white shadow text-gray-900' : 'text-muted hover:text-gray-700'
          }`}
        >
          Materials ({materials.length})
        </button>
        <button
          onClick={() => setTab('progress')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'progress' ? 'bg-white shadow text-gray-900' : 'text-muted hover:text-gray-700'
          }`}
        >
          Progress
        </button>
        <button
          onClick={() => setTab('engagement')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'engagement' ? 'bg-white shadow text-gray-900' : 'text-muted hover:text-gray-700'
          }`}
        >
          Engagement
        </button>
        <button
          onClick={() => setTab('survey')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'survey' ? 'bg-white shadow text-gray-900' : 'text-muted hover:text-gray-700'
          }`}
        >
          Survey
          {surveyResponses.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {surveyResponses.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'users' ? (
        <UsersTable users={users} orphanedUsers={orphanedUsers} />
      ) : tab === 'materials' ? (
        <MaterialsTable materials={materials} />
      ) : tab === 'progress' ? (
        <UnifiedProgressView users={users} progressData={progressData} views={engagementData.views} />
      ) : tab === 'survey' ? (
        <AdminSurveyTab responses={surveyResponses} users={users as UserForSurvey[]} surveys={surveys} />
      ) : (
        <UnifiedProgressView users={users} progressData={progressData} views={engagementData.views} />
      )}
    </div>
  )
}

function UsersTable({ users, orphanedUsers }: { users: Profile[]; orphanedUsers: OrphanedUser[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null)
  const [deleteInput, setDeleteInput] = useState('')

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    setLoadingId(userId + '-role')
    setError(null)
    const result = await updateUserRole(userId, newRole)
    setLoadingId(null)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setLoadingId(deleteTarget.id + '-delete')
    setError(null)
    const result = await deleteUser(deleteTarget.id)
    setLoadingId(null)
    setDeleteTarget(null)
    setDeleteInput('')
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  async function handleCreateProfile(u: OrphanedUser) {
    setLoadingId(u.id + '-fix')
    setError(null)
    const result = await createMissingProfile(u.id, u.email, u.full_name)
    setLoadingId(null)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete user</h3>
                <p className="text-sm text-muted mt-0.5">
                  This will permanently remove <span className="font-medium text-gray-800">{deleteTarget.email}</span> and all their data. This cannot be undone.
                </p>
              </div>
            </div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-900">{deleteTarget.email}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && deleteInput === deleteTarget.email) confirmDelete() }}
              placeholder={deleteTarget.email}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteInput('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteInput !== deleteTarget.email || !!loadingId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loadingId ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orphaned users — registered in auth but missing a profile */}
      {orphanedUsers.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm font-semibold text-amber-800">
              {orphanedUsers.length} registered {orphanedUsers.length === 1 ? 'user' : 'users'} without a profile
            </span>
            <span className="text-xs text-amber-600">— these users signed up but don&apos;t appear in the dashboard</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-200">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-amber-700 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-amber-700 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-amber-700 uppercase tracking-wider">Registered</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-amber-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {orphanedUsers.map(u => (
                <tr key={u.id} className="hover:bg-amber-100/40">
                  <td className="px-5 py-3 text-sm text-gray-800">{u.email}</td>
                  <td className="px-5 py-3 text-sm text-muted">{u.full_name || '—'}</td>
                  <td className="px-5 py-3 text-sm text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCreateProfile(u)}
                        disabled={!!loadingId}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium disabled:opacity-50 border border-amber-300 hover:border-amber-500 px-2.5 py-1 rounded-md transition-colors"
                      >
                        {loadingId === u.id + '-fix' ? 'Creating...' : 'Create profile'}
                      </button>
                      <button
                        onClick={() => { setDeleteTarget({ id: u.id, email: u.email }); setDeleteInput('') }}
                        disabled={!!loadingId}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Joined</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Last Login</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {user.full_name || '—'}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-muted">{user.email}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-muted">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-sm text-muted">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString() + ' ' + new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={loadingId === user.id + '-role'}
                      className="text-xs text-primary hover:text-primary-dark font-medium disabled:opacity-50"
                    >
                      {loadingId === user.id + '-role' ? 'Saving...' : `Make ${user.role === 'admin' ? 'User' : 'Admin'}`}
                    </button>
                    <button
                      onClick={() => { setDeleteTarget({ id: user.id, email: user.email }); setDeleteInput('') }}
                      disabled={!!loadingId}
                      className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {loadingId === user.id + '-delete' ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MaterialsTable({ materials }: { materials: MaterialWithScores[] }) {
  const router = useRouter()

  async function handleDelete(materialId: string) {
    if (!confirm('Are you sure you want to delete this material?')) return
    const supabase = createClient()
    await supabase.from('materials').delete().eq('id', materialId)
    router.refresh()
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-border">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Title</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Categories</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Score</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Votes</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Uploaded</th>
            <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {materials.map(mat => (
            <tr key={mat.id} className="hover:bg-gray-50/50">
              <td className="px-5 py-3">
                <span className="text-sm font-medium text-gray-900">{mat.title}</span>
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                  {(mat.categories || []).slice(0, 2).map(cat => (
                    <span key={cat} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {cat}
                    </span>
                  ))}
                  {(mat.categories || []).length > 2 && (
                    <span className="text-xs text-muted">+{mat.categories.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3 text-sm text-muted">
                {mat.vote_count > 0 ? mat.avg_overall.toFixed(1) : '—'}
              </td>
              <td className="px-5 py-3 text-sm text-muted">{mat.vote_count}</td>
              <td className="px-5 py-3 text-sm text-muted">
                {new Date(mat.created_at).toLocaleDateString()}
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => handleDelete(mat.id)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {materials.length === 0 && (
        <div className="p-8 text-center text-muted text-sm">No materials yet.</div>
      )}
    </div>
  )
}

// ─── Unified Progress View ────────────────────────────────────────────────────

function normalizeTier(tier: string | null | undefined): string {
  if (!tier) return ''
  return tier.toLowerCase().replace(/[\s_-]+/g, '')
}

function tierLabel(tier: string | null | undefined): string {
  const t = normalizeTier(tier)
  if (t === 'mustread') return 'Must Read'
  if (t === 'core') return 'Core'
  return tier || ''
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  weekly: 'Weekly Session',
  team: 'Team Session',
  speaker: 'Speaker Session',
}

function UnifiedProgressView({
  users,
  progressData,
  views,
}: {
  users: Profile[]
  progressData: ProgressRawData
  views: ViewRecord[]
}) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Required materials per week (Must Read / Core only)
  const weekRequiredMaterials: Record<string, typeof progressData.materials> = {}
  for (const week of WEEKS) {
    const mats = progressData.materials.filter(m => {
      if (m.week !== week) return false
      const t = normalizeTier(m.material_tier)
      return t === 'mustread' || t === 'core'
    })
    if (mats.length > 0) weekRequiredMaterials[week] = mats
  }
  const activeWeeks = Object.keys(weekRequiredMaterials)

  // Sessions grouped by week
  const weekSessions: Record<string, typeof progressData.sessions> = {}
  progressData.sessions.forEach(s => {
    if (!weekSessions[s.week]) weekSessions[s.week] = []
    weekSessions[s.week].push(s)
  })

  // Members only
  const members = users.filter(u => u.role !== 'admin')

  // Build per-user lookup maps
  const userViewsMap: Record<string, ViewRecord[]> = {}
  views.forEach(v => {
    if (!userViewsMap[v.user_id]) userViewsMap[v.user_id] = []
    userViewsMap[v.user_id].push(v)
  })

  const userVotesMap: Record<string, typeof progressData.votes> = {}
  progressData.votes.forEach(v => {
    if (!userVotesMap[v.user_id]) userVotesMap[v.user_id] = []
    userVotesMap[v.user_id].push(v)
  })

  const userDeliverablesMap: Record<string, Record<string, typeof progressData.deliverables[0]>> = {}
  progressData.deliverables.forEach(d => {
    if (!userDeliverablesMap[d.user_id]) userDeliverablesMap[d.user_id] = {}
    userDeliverablesMap[d.user_id][d.week] = d
  })

  // ─── Helpers ────────────────────────────────────────────────────────────────

  type UserWeekStats = { opened: number; scored: number; commented: number; total: number; delivered: boolean; deliverableLink: string | null; deliverableDate: string | null }

  function getUserWeekStats(userId: string, week: string): UserWeekStats {
    const required = weekRequiredMaterials[week] || []
    const requiredIds = new Set(required.map(m => m.id))
    const uViews = userViewsMap[userId] || []
    const uVotes = userVotesMap[userId] || []
    const deliverable = userDeliverablesMap[userId]?.[week]
    return {
      opened: new Set(uViews.filter(v => requiredIds.has(v.material_id)).map(v => v.material_id)).size,
      scored: new Set(uVotes.filter(v => requiredIds.has(v.material_id)).map(v => v.material_id)).size,
      commented: new Set(uVotes.filter(v => requiredIds.has(v.material_id) && v.comment && v.comment.trim() !== '').map(v => v.material_id)).size,
      total: required.length,
      delivered: !!deliverable,
      deliverableLink: deliverable?.link || null,
      deliverableDate: deliverable?.submitted_at || null,
    }
  }

  function getMaterialDetail(userId: string, materialId: string) {
    const uViews = (userViewsMap[userId] || []).filter(v => v.material_id === materialId)
    const uVote = (userVotesMap[userId] || []).find(v => v.material_id === materialId)
    const viewCount = uViews.length
    const firstView = uViews.length > 0 ? uViews.reduce((min, v) => new Date(v.viewed_at) < new Date(min.viewed_at) ? v : min) : null
    const lastView = uViews.length > 1 ? uViews.reduce((max, v) => new Date(v.viewed_at) > new Date(max.viewed_at) ? v : max) : null
    return { viewCount, firstView, lastView, reopened: viewCount > 1, vote: uVote || null }
  }

  function getUserTotalScore(userId: string) {
    let opened = 0; let scored = 0; let commented = 0; let delivered = 0; let total = 0
    activeWeeks.forEach(week => {
      const s = getUserWeekStats(userId, week)
      opened += s.opened; scored += s.scored; commented += s.commented; total += s.total
      if (s.delivered) delivered++
    })
    return { opened, scored, commented, delivered, total, engagementScore: opened + scored + commented + delivered }
  }

  // ─── Aggregates ─────────────────────────────────────────────────────────────

  // Per-week stats
  const weekAggregates: Record<string, { avgOpened: number; scoredMembers: number; commentedMembers: number; deliveredMembers: number; totalRequired: number; mostEngagedName: string; mostEngagedScore: number; topReaderName: string; topReaderCount: number }> = {}
  let globalTotalRequired = 0; let globalTotalOpened = 0

  activeWeeks.forEach(week => {
    const required = weekRequiredMaterials[week]
    let wOpened = 0; let wScored = 0; let wCommented = 0; let wDelivered = 0
    let bestEngName = '—'; let bestEngScore = 0; let bestReadName = '—'; let bestReadCount = 0

    members.forEach(user => {
      const s = getUserWeekStats(user.id, week)
      globalTotalRequired += s.total; globalTotalOpened += s.opened
      wOpened += s.opened
      if (s.scored > 0) wScored++
      if (s.commented > 0) wCommented++
      if (s.delivered) wDelivered++
      const eng = s.opened + s.scored + s.commented + (s.delivered ? 1 : 0)
      if (eng > bestEngScore) { bestEngScore = eng; bestEngName = user.full_name || user.email }
      if (s.opened > bestReadCount) { bestReadCount = s.opened; bestReadName = user.full_name || user.email }
    })

    weekAggregates[week] = {
      avgOpened: members.length > 0 ? wOpened / members.length : 0,
      scoredMembers: wScored, commentedMembers: wCommented, deliveredMembers: wDelivered,
      totalRequired: required.length,
      mostEngagedName: bestEngName, mostEngagedScore: bestEngScore,
      topReaderName: bestReadName, topReaderCount: bestReadCount,
    }
  })

  const overallPct = globalTotalRequired > 0 ? Math.round((globalTotalOpened / globalTotalRequired) * 100) : 0
  const avgReadsPerWeek = (members.length > 0 && activeWeeks.length > 0) ? (globalTotalOpened / members.length / activeWeeks.length).toFixed(1) : '0'

  // Ranked members — sort by % of materials opened, tiebreak by engagement breadth
  const memberRanking = members.map(u => {
    const s = getUserTotalScore(u.id)
    const pct = s.total > 0 ? s.opened / s.total : 0
    return { user: u, ...s, pct }
  }).sort((a, b) => b.pct - a.pct || b.engagementScore - a.engagementScore)

  // Top reviewed materials (by vote count + avg score)
  const materialVoteCounts: Record<string, { title: string; tier: string | null; voteCount: number; totalQuality: number; totalRelevance: number }> = {}
  progressData.votes.forEach(v => {
    const mat = progressData.materials.find(m => m.id === v.material_id)
    if (!mat) return
    if (!materialVoteCounts[v.material_id]) materialVoteCounts[v.material_id] = { title: mat.title || mat.id, tier: mat.material_tier, voteCount: 0, totalQuality: 0, totalRelevance: 0 }
    materialVoteCounts[v.material_id].voteCount++
    materialVoteCounts[v.material_id].totalQuality += v.quality_score
    materialVoteCounts[v.material_id].totalRelevance += v.relevance_score
  })
  const topMaterials = Object.entries(materialVoteCounts)
    .map(([id, d]) => ({ id, ...d, avgScore: d.voteCount > 0 ? ((d.totalQuality + d.totalRelevance) / (d.voteCount * 2)) : 0 }))
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 5)

  // Fully complete count
  let fullyComplete = 0
  members.forEach(user => {
    if (activeWeeks.every(week => { const s = getUserWeekStats(user.id, week); return s.opened === s.total && s.scored === s.total && s.delivered })) fullyComplete++
  })

  return (
    <div className="space-y-6">
      {/* ─── Summary Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Overall Progress</p>
          <p className="text-2xl font-bold text-gray-900">{overallPct}%</p>
          <p className="text-xs text-muted mt-0.5">materials opened</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Avg. Reads / Week</p>
          <p className="text-2xl font-bold text-gray-900">{avgReadsPerWeek}</p>
          <p className="text-xs text-muted mt-0.5">per member per week</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Fully Complete</p>
          <p className="text-2xl font-bold text-gray-900">{fullyComplete} <span className="text-sm font-normal text-muted">of {members.length}</span></p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Active Weeks</p>
          <p className="text-2xl font-bold text-gray-900">{activeWeeks.length}</p>
          <p className="text-xs text-muted mt-0.5">{members.length} members tracked</p>
        </div>
      </div>

      {/* ─── Two-Panel Insights ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel — Member Leaderboard */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-900">Member Leaderboard</h3>
            <p className="text-xs text-muted">Ranked by % of required materials opened</p>
          </div>
          <div className="divide-y divide-border">
            {memberRanking.slice(0, 8).map((m, i) => {
              const pct = m.total > 0 ? Math.round((m.opened / m.total) * 100) : 0
              return (
                <div key={m.user.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.user.full_name || m.user.email}</p>
                    <p className="text-xs text-muted">{m.opened} read · {m.scored} scored · {m.commented} commented · {m.delivered} delivered</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{pct}%</p>
                    <p className="text-[10px] text-muted">{m.opened}/{m.total}</p>
                  </div>
                </div>
              )
            })}
            {members.length === 0 && <div className="p-6 text-center text-muted text-sm">No members yet.</div>}
          </div>
        </div>

        {/* Right Panel — Top Materials */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-900">Top Reviewed Materials</h3>
            <p className="text-xs text-muted">Most voted materials and their average scores</p>
          </div>
          <div className="divide-y divide-border">
            {topMaterials.map((mat, i) => (
              <div key={mat.id} className="px-5 py-3 flex items-start gap-3">
                <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{mat.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      normalizeTier(mat.tier) === 'mustread' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>{tierLabel(mat.tier)}</span>
                    <span className="text-xs text-muted">{mat.voteCount} review{mat.voteCount > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-purple-700">{mat.avgScore.toFixed(1)}<span className="text-xs font-normal text-muted">/5</span></p>
                </div>
              </div>
            ))}
            {topMaterials.length === 0 && <div className="p-6 text-center text-muted text-sm">No reviews yet.</div>}
          </div>
        </div>
      </div>

      {/* ─── Performance Metrics (per week) ────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Performance Metrics</h3>
        <p className="text-xs text-muted mb-4">Completion, scoring, commenting, and delivery rates per week</p>
        {activeWeeks.length === 0 ? (
          <p className="text-sm text-muted">No weeks with required materials yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted uppercase tracking-wider">Week</th>
                  <th className="text-center py-2 px-3 font-medium text-muted uppercase tracking-wider">Materials</th>
                  <th className="text-center py-2 px-3 font-medium text-muted uppercase tracking-wider">Opened</th>
                  <th className="text-center py-2 px-3 font-medium text-muted uppercase tracking-wider">Scored</th>
                  <th className="text-center py-2 px-3 font-medium text-muted uppercase tracking-wider">Commented</th>
                  <th className="text-center py-2 px-3 font-medium text-muted uppercase tracking-wider">Delivered</th>
                  <th className="text-left py-2 px-3 font-medium text-muted uppercase tracking-wider">Most Engaged</th>
                  <th className="text-left py-2 pl-3 font-medium text-muted uppercase tracking-wider">Top Reader</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeWeeks.map(week => {
                  const wa = weekAggregates[week]
                  const openPct = wa.totalRequired > 0 ? Math.round((wa.avgOpened / wa.totalRequired) * 100) : 0
                  const scorePct = members.length > 0 ? Math.round((wa.scoredMembers / members.length) * 100) : 0
                  const commentPct = members.length > 0 ? Math.round((wa.commentedMembers / members.length) * 100) : 0
                  const deliverPct = members.length > 0 ? Math.round((wa.deliveredMembers / members.length) * 100) : 0
                  return (
                    <tr key={week} className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4 font-semibold text-gray-900">{week}</td>
                      <td className="py-2.5 px-3 text-center text-muted">{wa.totalRequired}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${openPct >= 75 ? 'bg-green-100 text-green-700' : openPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{openPct}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${scorePct >= 75 ? 'bg-green-100 text-green-700' : scorePct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{scorePct}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${commentPct >= 75 ? 'bg-green-100 text-green-700' : commentPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{commentPct}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${deliverPct >= 75 ? 'bg-green-100 text-green-700' : deliverPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{deliverPct}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted truncate max-w-[120px]">{wa.mostEngagedName}</td>
                      <td className="py-2.5 pl-3 text-muted truncate max-w-[120px]">{wa.topReaderName} <span className="text-gray-400">({wa.topReaderCount})</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Individual Progress with week tabs ────────────────────────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Individual Progress</h3>
          <p className="text-xs text-muted">Click a member, then navigate between weeks</p>
        </div>

        {members.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">No members yet.</div>
        )}

        <div className="divide-y divide-border">
          {members.map(user => {
            const overall = getUserTotalScore(user.id)
            const overallPctUser = overall.total > 0 ? Math.round((overall.opened / overall.total) * 100) : 0
            const isExpanded = expandedUser === user.id
            const currentWeek = selectedWeek && activeWeeks.includes(selectedWeek) ? selectedWeek : activeWeeks[0]

            return (
              <div key={user.id}>
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => { setExpandedUser(isExpanded ? null : user.id); if (!isExpanded) setSelectedWeek(activeWeeks[0] || null) }}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || '—'}</p>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    {activeWeeks.map(week => {
                      const s = getUserWeekStats(user.id, week)
                      const bg = s.opened === s.total && s.total > 0 ? 'bg-green-500' : s.opened > 0 ? 'bg-amber-400' : 'bg-gray-200'
                      return <div key={week} className={`w-5 h-5 rounded ${bg} flex items-center justify-center`} title={`${week}: ${s.opened}/${s.total}`}><span className="text-[9px] font-bold text-white">{s.opened}</span></div>
                    })}
                  </div>
                  <div className="flex items-center gap-2 w-28">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${overallPctUser === 100 ? 'bg-green-500' : overallPctUser > 0 ? 'bg-primary' : 'bg-gray-200'}`} style={{ width: `${overallPctUser}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8 text-right">{overallPctUser}%</span>
                  </div>
                  <svg className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded: week tabs + material detail */}
                {isExpanded && currentWeek && (
                  <div className="bg-gray-50 border-t border-border">
                    {/* Week tabs */}
                    <div className="px-5 pt-3 pb-0 flex flex-wrap gap-1">
                      {activeWeeks.map(week => {
                        const s = getUserWeekStats(user.id, week)
                        const isActive = week === currentWeek
                        return (
                          <button
                            key={week}
                            onClick={() => setSelectedWeek(week)}
                            className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors border border-b-0 ${
                              isActive
                                ? 'bg-white text-gray-900 border-gray-200'
                                : 'bg-transparent text-muted hover:text-gray-700 border-transparent'
                            }`}
                          >
                            {week}
                            <span className={`ml-1.5 ${s.opened === s.total && s.total > 0 ? 'text-green-600' : s.opened > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {s.opened}/{s.total}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Selected week content */}
                    {(() => {
                      const required = weekRequiredMaterials[currentWeek] || []
                      const stats = getUserWeekStats(user.id, currentWeek)
                      const sessions = weekSessions[currentWeek] || []
                      const deliverable = userDeliverablesMap[user.id]?.[currentWeek]

                      return (
                        <div className="mx-5 mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
                          {/* Week summary bar */}
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <span className="text-xs text-muted">
                              {stats.opened}/{stats.total} opened · {stats.scored}/{stats.total} scored · {stats.commented}/{stats.total} commented
                            </span>
                            <div className="flex items-center gap-2">
                              {stats.opened === stats.total && stats.total > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">All Read</span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0}%</span>
                              )}
                              <button
                                onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                  editingUser === user.id
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-muted border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {editingUser === user.id ? 'Done Editing' : 'Edit'}
                              </button>
                            </div>
                          </div>

                          {/* Material list */}
                          <div className="divide-y divide-gray-50">
                            {required.map(mat => {
                              const detail = getMaterialDetail(user.id, mat.id)
                              const isEditing = editingUser === user.id
                              return (
                                <div key={mat.id} className="px-4 py-2.5">
                                  <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${detail.viewCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${detail.viewCount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{mat.title || mat.id}</p>
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${normalizeTier(mat.material_tier) === 'mustread' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{tierLabel(mat.material_tier)}</span>
                                        {detail.viewCount > 0 ? (
                                          <span className="text-[10px] text-muted">
                                            {detail.viewCount} view{detail.viewCount > 1 ? 's' : ''}
                                            {detail.firstView && <> · {new Date(detail.firstView.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                                            {detail.reopened && detail.lastView && <> · <span className="text-blue-600">reopened {new Date(detail.lastView.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></>}
                                          </span>
                                        ) : <span className="text-[10px] text-gray-400">Not opened</span>}
                                        {detail.vote ? (
                                          <span className="text-[10px] text-purple-600">{((detail.vote.quality_score + detail.vote.relevance_score) / 2).toFixed(1)}/5</span>
                                        ) : <span className="text-[10px] text-gray-400">No score</span>}
                                        {detail.vote?.comment && detail.vote.comment.trim() !== '' ? (
                                          <span className="text-[10px] text-amber-600">Commented</span>
                                        ) : <span className="text-[10px] text-gray-400">No comment</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Inline edit controls */}
                                  {isEditing && (
                                    <MaterialEditRow
                                      userId={user.id}
                                      materialId={mat.id}
                                      materialWeek={currentWeek}
                                      hasView={detail.viewCount > 0}
                                      existingVote={detail.vote}
                                      saving={saving}
                                      setSaving={setSaving}
                                      onDone={() => router.refresh()}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Footer: deliverable + sessions */}
                          <div className="px-4 py-2.5 border-t border-gray-100">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {deliverable ? (
                                <span className="text-xs text-green-700">
                                  Delivered {new Date(deliverable.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {deliverable.link && <a href={deliverable.link} target="_blank" rel="noopener noreferrer" className="ml-1 underline hover:text-green-900">Link</a>}
                                </span>
                              ) : <span className="text-xs text-gray-400">Deliverable pending</span>}
                              {sessions.length > 0 ? (
                                <span className="text-xs text-muted">Sessions: {sessions.map(s => SESSION_TYPE_LABEL[s.session_type] || s.title).join(', ')}</span>
                              ) : <span className="text-xs text-gray-400">No sessions</span>}
                            </div>

                            {/* Deliverable edit controls */}
                            {editingUser === user.id && (
                              <DeliverableEditRow
                                userId={user.id}
                                week={currentWeek}
                                existingDeliverable={deliverable}
                                saving={saving}
                                setSaving={setSaving}
                                onDone={() => router.refresh()}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Inline edit components ──────────────────────────────────────────────────

function MaterialEditRow({
  userId, materialId, materialWeek, hasView, existingVote, saving, setSaving, onDone,
}: {
  userId: string
  materialId: string
  materialWeek: string
  hasView: boolean
  existingVote: { quality_score: number; relevance_score: number; comment: string | null } | null
  saving: boolean
  setSaving: (v: boolean) => void
  onDone: () => void
}) {
  const [quality, setQuality] = useState(existingVote?.quality_score ?? 0)
  const [relevance, setRelevance] = useState(existingVote?.relevance_score ?? 0)
  const [comment, setComment] = useState(existingVote?.comment ?? '')

  async function toggleView() {
    setSaving(true)
    if (hasView) {
      await adminRemoveViews(userId, materialId)
    } else {
      await adminRecordView(userId, materialId, materialWeek)
    }
    setSaving(false)
    onDone()
  }

  async function saveScore() {
    if (quality < 1 || quality > 5 || relevance < 1 || relevance > 5) return
    setSaving(true)
    await adminUpsertVote(userId, materialId, quality, relevance, comment || undefined)
    setSaving(false)
    onDone()
  }

  async function removeScore() {
    setSaving(true)
    await adminRemoveVote(userId, materialId)
    setQuality(0)
    setRelevance(0)
    setComment('')
    setSaving(false)
    onDone()
  }

  return (
    <div className="mt-2 ml-5 pl-3 border-l-2 border-primary/20 space-y-2">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          disabled={saving}
          onClick={toggleView}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
            hasView
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
          }`}
        >
          {hasView ? 'Remove view' : 'Mark as opened'}
        </button>
      </div>

      {/* Score inputs */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] text-muted">Quality:</label>
        <select value={quality} onChange={e => setQuality(Number(e.target.value))} className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white">
          <option value={0}>—</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <label className="text-[10px] text-muted">Relevance:</label>
        <select value={relevance} onChange={e => setRelevance(Number(e.target.value))} className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white">
          <option value={0}>—</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          type="text"
          placeholder="Comment (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="text-[10px] border border-gray-200 rounded px-2 py-0.5 flex-1 min-w-[120px]"
        />
        <button
          disabled={saving || quality < 1 || relevance < 1}
          onClick={saveScore}
          className="text-[10px] px-2 py-0.5 rounded bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition-colors"
        >
          {existingVote ? 'Update Score' : 'Add Score'}
        </button>
        {existingVote && (
          <button
            disabled={saving}
            onClick={removeScore}
            className="text-[10px] px-2 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

function DeliverableEditRow({
  userId, week, existingDeliverable, saving, setSaving, onDone,
}: {
  userId: string
  week: string
  existingDeliverable: { link: string | null; notes: string | null; submitted_at: string } | undefined
  saving: boolean
  setSaving: (v: boolean) => void
  onDone: () => void
}) {
  const [link, setLink] = useState(existingDeliverable?.link ?? '')
  const [notes, setNotes] = useState(existingDeliverable?.notes ?? '')

  async function saveDeliverable() {
    if (!link.trim() && !notes.trim()) return
    setSaving(true)
    await adminUpsertDeliverable(userId, week, link || undefined, notes || undefined)
    setSaving(false)
    onDone()
  }

  async function removeDeliverable() {
    setSaving(true)
    await adminRemoveDeliverable(userId, week)
    setLink('')
    setNotes('')
    setSaving(false)
    onDone()
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
      <p className="text-[10px] font-medium text-muted">Edit Deliverable</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          placeholder="Deliverable link (https://...)"
          value={link}
          onChange={e => setLink(e.target.value)}
          className="text-[10px] border border-gray-200 rounded px-2 py-0.5 flex-1 min-w-[160px]"
        />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="text-[10px] border border-gray-200 rounded px-2 py-0.5 flex-1 min-w-[120px]"
        />
        <button
          disabled={saving || (!link.trim() && !notes.trim())}
          onClick={saveDeliverable}
          className="text-[10px] px-2 py-0.5 rounded bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition-colors"
        >
          {existingDeliverable ? 'Update' : 'Add Deliverable'}
        </button>
        {existingDeliverable && (
          <button
            disabled={saving}
            onClick={removeDeliverable}
            className="text-[10px] px-2 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

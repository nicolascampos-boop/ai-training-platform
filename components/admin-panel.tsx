'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteUser, updateUserRole, createMissingProfile } from '@/lib/actions/profiles'
import type { OrphanedUser } from '@/lib/actions/profiles'
import type { Profile, MaterialWithScores } from '@/lib/supabase/types'
import { WEEKS } from '@/lib/supabase/types'
import AdminSurveyTab, { type SurveyResponseWithProfile } from '@/components/admin-survey-tab'

interface ProgressRawData {
  materials: { id: string; week: string | null; material_tier: string | null; title?: string | null }[]
  votes: { user_id: string; material_id: string; comment: string | null }[]
  deliverables: { user_id: string; week: string }[]
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
}

export default function AdminPanel({ users, materials, orphanedUsers, progressData, engagementData, surveyResponses }: AdminPanelProps) {
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
        <UserProgressView users={users} progressData={progressData} />
      ) : tab === 'survey' ? (
        <AdminSurveyTab responses={surveyResponses} totalUsers={users.filter(u => u.role === 'user').length} />
      ) : (
        <EngagementView users={users} progressData={progressData} views={engagementData.views} />
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

// ─── User Progress View ────────────────────────────────────────────────────────

interface WeekStat {
  week: string
  total: number
  reviewed: number
  hasDeliverable: boolean
  pct: number
  complete: boolean
}

function normalizeTier(tier: string | null | undefined): string {
  if (!tier) return ''
  return tier.toLowerCase().replace(/[\s_-]+/g, '')
}

function UserProgressView({ users, progressData }: { users: Profile[]; progressData: ProgressRawData }) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  // Pre-compute required materials per week (shared across all users)
  const weekRequiredMaterials: Record<string, string[]> = {}
  for (const week of WEEKS) {
    weekRequiredMaterials[week] = progressData.materials
      .filter(m => {
        if (m.week !== week) return false
        const t = normalizeTier(m.material_tier)
        return t === 'mustread' || t === 'core'
      })
      .map(m => m.id)
  }

  // Compute progress for each user
  const userProgress = users.map(user => {
    const reviewedIds = new Set(
      progressData.votes
        .filter(v => v.user_id === user.id)
        .map(v => v.material_id)
    )
    const deliverableWeeks = new Set(
      progressData.deliverables
        .filter(d => d.user_id === user.id)
        .map(d => d.week)
    )

    const weekStats = WEEKS
      .map(week => {
        const required = weekRequiredMaterials[week]
        const total = required.length
        if (total === 0) return null
        const reviewed = required.filter(id => reviewedIds.has(id)).length
        const hasDeliverable = deliverableWeeks.has(week)
        const pct = Math.round((reviewed / total) * 60 + (hasDeliverable ? 40 : 0))
        const complete = reviewed === total && hasDeliverable
        return { week, total, reviewed, hasDeliverable, pct, complete }
      })
      .filter((s) => s !== null) as WeekStat[]

    const overallPct = weekStats.length > 0
      ? Math.round(weekStats.reduce((sum, w) => sum + w.pct, 0) / weekStats.length)
      : 0
    const weeksComplete = weekStats.filter(w => w.complete).length

    return { user, weekStats, overallPct, weeksComplete }
  })

  return (
    <div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Member</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Weeks Done</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Overall Progress</th>
              <th className="px-5 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {userProgress.map(({ user, weekStats, overallPct, weeksComplete }) => (
              <tr key={user.id} className="cursor-pointer" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                <td className="px-5 py-3" colSpan={expandedUser === user.id ? undefined : undefined}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </div>
                  </div>
                  {/* Per-week progress — shown inline when expanded */}
                  {expandedUser === user.id && weekStats.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4 mb-1">
                      {weekStats.map(stat => (
                        <div
                          key={stat.week}
                          className={`rounded-lg border p-3 ${stat.complete ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-gray-800">{stat.week}</span>
                            {stat.complete
                              ? <span className="text-xs text-green-600 font-medium">✓ Done</span>
                              : <span className="text-xs text-gray-500">{stat.pct}%</span>
                            }
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${stat.complete ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${stat.pct}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{stat.reviewed}/{stat.total} reviewed</span>
                            <span className="text-gray-300">·</span>
                            <span className={stat.hasDeliverable ? 'text-green-600' : 'text-gray-400'}>
                              {stat.hasDeliverable ? '✓ deliverable' : 'deliverable pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 align-top">
                  <span className="text-sm text-gray-900">{weeksComplete}/{weekStats.length}</span>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[6rem]">
                      <div
                        className={`h-2 rounded-full transition-all ${overallPct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-8 text-right">{overallPct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top text-right">
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${expandedUser === user.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">No users yet.</div>
        )}
      </div>
    </div>
  )
}

// ─── Engagement View ───────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  library: 'Library',
  dashboard: 'Dashboard',
  other: 'Direct',
}

function EngagementView({
  users,
  progressData,
  views,
}: {
  users: Profile[]
  progressData: ProgressRawData
  views: ViewRecord[]
}) {
  const [selectedWeek, setSelectedWeek] = useState<string>(WEEKS[0])
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  // Required materials for the selected week
  const weekMaterials = progressData.materials.filter(m => m.week === selectedWeek)
  const requiredMaterials = weekMaterials.filter(m => {
    const t = normalizeTier(m.material_tier)
    return t === 'mustread' || t === 'core'
  })
  const requiredIds = new Set(requiredMaterials.map(m => m.id))

  // Per-user engagement stats (non-admin users only)
  const userStats = users
    .filter(u => u.role !== 'admin')
    .map(user => {
      // Views for this user that correspond to a required material in this week
      const userViews = views.filter(
        v => v.user_id === user.id && requiredIds.has(v.material_id)
      )
      const viewedIds = new Set(userViews.map(v => v.material_id))
      const viewedCount = viewedIds.size

      // First time they opened any material in this week
      const firstView = userViews.length > 0
        ? userViews.reduce((min, v) =>
            new Date(v.viewed_at) < new Date(min.viewed_at) ? v : min
          )
        : null

      // Unique sources used
      const sources = [...new Set(userViews.map(v => v.source))]

      // Per-material detail: first view timestamp + source for each required material
      const materialDetail = requiredMaterials.map(mat => {
        const matViews = userViews
          .filter(v => v.material_id === mat.id)
          .sort((a, b) => new Date(a.viewed_at).getTime() - new Date(b.viewed_at).getTime())
        const first = matViews[0] ?? null
        return { mat, first }
      })

      return { user, viewedCount, total: requiredMaterials.length, firstView, sources, materialDetail }
    })
    .sort((a, b) => b.viewedCount - a.viewedCount)

  const totalRequired = requiredMaterials.length

  return (
    <div>
      {/* Week selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {WEEKS.map(week => (
          <button
            key={week}
            onClick={() => { setSelectedWeek(week); setExpandedUser(null) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedWeek === week
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-muted hover:text-gray-700'
            }`}
          >
            {week}
          </button>
        ))}
      </div>

      {totalRequired === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted text-sm">
          No required materials (Must Read / Core) assigned to {selectedWeek} yet.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Header row */}
          <div className="bg-gray-50 border-b border-border px-5 py-3 flex items-center gap-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wider flex-1">
              Member
            </span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider w-36 text-center">
              Required viewed
            </span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider w-28 hidden sm:block">
              First opened
            </span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider w-24 hidden md:block">
              Via
            </span>
            <span className="w-5" />
          </div>

          {userStats.length === 0 && (
            <div className="p-8 text-center text-muted text-sm">No members to show.</div>
          )}

          {userStats.map(({ user, viewedCount, total, firstView, sources, materialDetail }) => {
            const allViewed = total > 0 && viewedCount === total
            const noneViewed = viewedCount === 0
            const isExpanded = expandedUser === user.id

            return (
              <div key={user.id} className="border-b border-border last:border-0">
                {/* Main row */}
                <div
                  className="flex items-center gap-2 px-5 py-3 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                >
                  {/* User */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || '—'}
                      </p>
                      <p className="text-xs text-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Progress pill */}
                  <div className="w-36 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          allViewed ? 'bg-green-500' : noneViewed ? 'bg-gray-300' : 'bg-amber-400'
                        }`}
                        style={{ width: total > 0 ? `${(viewedCount / total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className={`text-xs font-semibold w-10 text-right ${
                      allViewed ? 'text-green-600' : noneViewed ? 'text-gray-400' : 'text-amber-600'
                    }`}>
                      {viewedCount}/{total}
                    </span>
                  </div>

                  {/* First opened */}
                  <div className="w-28 hidden sm:block">
                    <span className="text-xs text-muted">
                      {firstView
                        ? new Date(firstView.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : <span className="text-gray-300">—</span>
                      }
                    </span>
                  </div>

                  {/* Source badges */}
                  <div className="w-24 hidden md:flex flex-wrap gap-1">
                    {sources.length > 0
                      ? sources.map(s => (
                          <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {SOURCE_LABEL[s] ?? s}
                          </span>
                        ))
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </div>

                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded: per-material breakdown */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-border px-5 py-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                      Required materials — {selectedWeek}
                    </p>
                    <div className="space-y-2">
                      {materialDetail.map(({ mat, first }) => (
                        <div key={mat.id} className="flex items-start gap-3">
                          {/* Viewed indicator */}
                          <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                            first ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {first ? (
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block" />
                            )}
                          </div>

                          {/* Title + meta */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${first ? 'text-gray-900' : 'text-gray-400'}`}>
                              {mat.title ?? mat.id}
                            </p>
                            {first && (
                              <p className="text-xs text-muted mt-0.5">
                                First opened{' '}
                                {new Date(first.viewed_at).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}{' '}
                                · via {SOURCE_LABEL[first.source] ?? first.source}
                              </p>
                            )}
                          </div>

                          {/* Tier badge */}
                          <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                            normalizeTier(mat.material_tier) === 'mustread'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {normalizeTier(mat.material_tier) === 'mustread' ? 'Must Read' : 'Core'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

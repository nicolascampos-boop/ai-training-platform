'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignSurvey, deleteSurveyResponse, createSurveyRound, setActiveSurvey } from '@/lib/actions/survey'

const CATEGORIES = [
  {
    key: 'monday_sessions',
    label: 'Weekly Sessions',
    question: 'Are the sessions guiding you to test and deepen your understanding of how AI can be integrated into your work and day-to-day?',
  },
  {
    key: 'deliverables',
    label: 'Assignments',
    question: 'Are the assignments giving you meaningful hands-on experience to experiment with AI tools?',
  },
  {
    key: 'material',
    label: 'Curriculum',
    question: 'Is the curriculum providing a broader perspective to explore the effects of AI in the work environment and across different contexts?',
  },
  {
    key: 'resources',
    label: 'Resources',
    question: 'Are the resources enabling you to go beyond a single tool and experiment broadly with AI and all its capabilities?',
  },
  {
    key: 'overall',
    label: 'Overall',
    question: 'Overall, is this program helping you develop a deeper and more up-to-date AI knowledge and understanding of how it connects with your work?',
  },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

export interface SurveyRound {
  id: string
  title: string
  is_active: boolean
  created_at: string
}

export interface SurveyResponseWithProfile {
  id: string
  user_id: string
  survey_id: string | null
  rating_monday_sessions: number | null
  rating_deliverables:    number | null
  rating_material:        number | null
  rating_resources:       number | null
  rating_overall:         number | null
  feedback_monday_sessions: string | null
  feedback_deliverables:    string | null
  feedback_material:        string | null
  feedback_resources:       string | null
  feedback_overall:         string | null
  wants_to_dig_deeper:   string | null
  wants_to_explore:      string | null
  feels_confident_about: string | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

export interface UserForSurvey {
  id: string
  email: string
  full_name: string | null
  role: string
  survey_required: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAvg(responses: SurveyResponseWithProfile[], key: `rating_${CategoryKey}`): number | null {
  const vals = responses.map(r => r[key]).filter((v): v is number => v !== null)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function calcDist(responses: SurveyResponseWithProfile[], key: `rating_${CategoryKey}`): number[] {
  const counts = [0, 0, 0, 0, 0]
  for (const r of responses) {
    const v = r[key]
    if (v !== null && v >= 1 && v <= 5) counts[v - 1]++
  }
  return counts
}

function respondentName(r: SurveyResponseWithProfile): string {
  return r.profiles?.full_name || r.profiles?.email || 'Unknown'
}

function Stars({ rating, size = 'sm' }: { rating: number | null; size?: 'sm' | 'md' }) {
  if (rating === null || rating === 0) return <span className="text-gray-300 text-xs">—</span>
  const cls = size === 'md' ? 'text-base' : 'text-sm'
  return (
    <span className={`${cls} leading-none`}>
      <span className="text-yellow-400">{'★'.repeat(rating)}</span>
      <span className="text-gray-200">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

const RATING_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' }

// ─── Delete confirm dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({
  userName,
  onConfirm,
  onCancel,
  isPending,
}: {
  userName: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const [input, setInput] = useState('')
  const canConfirm = input.toLowerCase() === 'delete'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-gray-900">Delete survey response?</h3>
          <p className="text-sm text-gray-500">
            This will permanently delete <span className="font-medium text-gray-800">{userName}</span>&apos;s
            response. If they are still assigned the survey, they will need to fill it out again.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            Type <span className="font-mono font-bold text-red-600">delete</span> to confirm
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="delete"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-400 rounded-lg transition-colors"
          >
            {isPending ? 'Deleting...' : 'Delete Response'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminSurveyTab({
  responses,
  users,
  surveys,
}: {
  responses: SurveyResponseWithProfile[]
  users: UserForSurvey[]
  surveys: SurveyRound[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Active survey round selection
  const activeSurvey = surveys.find(s => s.is_active) ?? null
  const [viewingSurveyId, setViewingSurveyId] = useState<string>(activeSurvey?.id ?? surveys[0]?.id ?? '')

  // Create round state
  const [showCreateRound, setShowCreateRound] = useState(false)
  const [newRoundTitle, setNewRoundTitle] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; surveyId: string; name: string } | null>(null)

  // Assignment selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Results view: 'by-category' or 'by-person'
  const [resultsView, setResultsView] = useState<'by-category' | 'by-person'>('by-category')

  // Filter responses to the viewed round
  const roundResponses = responses.filter(r => r.survey_id === viewingSurveyId)
  const completedIds = new Set(roundResponses.map(r => r.user_id))

  const allUsers = users
  const totalAssignable = allUsers.length

  const responseRate = totalAssignable > 0
    ? Math.round((roundResponses.length / totalAssignable) * 100)
    : 0

  const overallAvgNum = roundResponses.length > 0
    ? (() => {
        const vals = roundResponses.map(r => r.rating_overall).filter((v): v is number => v !== null)
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      })()
    : null

  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      }
      return new Set([...prev, ...ids])
    })
  }

  function handleAssign(required: boolean) {
    if (selectedIds.size === 0) return
    setError(null)
    startTransition(async () => {
      const result = await assignSurvey([...selectedIds], required)
      if (result?.error) {
        setError(result.error)
      } else {
        setSelectedIds(new Set())
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteSurveyResponse(deleteTarget.userId, deleteTarget.surveyId)
      setDeleteTarget(null)
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleCreateRound() {
    if (!newRoundTitle.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createSurveyRound(newRoundTitle.trim())
      if (result?.error) {
        setError(result.error)
      } else {
        setNewRoundTitle('')
        setShowCreateRound(false)
        router.refresh()
      }
    })
  }

  function handleSetActive(surveyId: string) {
    setError(null)
    startTransition(async () => {
      const result = await setActiveSurvey(surveyId)
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  // Group users by status for the viewed round
  const pendingUsers   = allUsers.filter(u => u.survey_required && !completedIds.has(u.id))
  const completedUsers = allUsers.filter(u => completedIds.has(u.id))
  const notAssigned    = allUsers.filter(u => !u.survey_required && !completedIds.has(u.id))

  return (
    <div className="space-y-8">

      {deleteTarget && (
        <DeleteConfirmDialog
          userName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isPending={isPending}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* ── Survey Rounds header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {surveys.map(s => (
            <button
              key={s.id}
              onClick={() => setViewingSurveyId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                viewingSurveyId === s.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.title}
              {s.is_active && (
                <span className="text-[9px] font-bold bg-white/20 px-1 py-0.5 rounded">ACTIVE</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowCreateRound(v => !v)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            + New Round
          </button>
        </div>

        {/* Set active button for non-active viewed round */}
        {viewingSurveyId && !surveys.find(s => s.id === viewingSurveyId)?.is_active && (
          <button
            onClick={() => handleSetActive(viewingSurveyId)}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            Set as Active
          </button>
        )}
      </div>

      {/* Create round form */}
      {showCreateRound && (
        <div className="bg-gray-50 border border-border rounded-xl p-4 flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-600">New survey round title</label>
            <input
              type="text"
              value={newRoundTitle}
              onChange={e => setNewRoundTitle(e.target.value)}
              placeholder="e.g. Engagement Survey #2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && handleCreateRound()}
            />
          </div>
          <button
            onClick={handleCreateRound}
            disabled={isPending || !newRoundTitle.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isPending ? 'Creating...' : 'Create & Activate'}
          </button>
          <button
            onClick={() => setShowCreateRound(false)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">{roundResponses.length}</p>
          <p className="text-xs text-muted mt-0.5">Responses</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
          <p className="text-xs text-muted mt-0.5">Response rate ({roundResponses.length}/{totalAssignable})</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">
            {overallAvgNum !== null ? overallAvgNum.toFixed(1) : '—'}
            <span className="text-sm font-normal text-muted">/5</span>
          </p>
          <p className="text-xs text-muted mt-0.5">Avg overall rating</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
          <p className="text-xs text-muted mt-0.5">Assigned, pending</p>
        </div>
      </div>

      {/* ── Send / Manage Survey ───────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Manage Survey Access</h3>
            <p className="text-xs text-muted mt-0.5">
              Select anyone — including yourself — and require or remove the survey. Assigned users are gated until they complete the active round.
            </p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleAssign(false)}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                Remove requirement ({selectedIds.size})
              </button>
              <button
                onClick={() => handleAssign(true)}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors"
              >
                Require survey ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {pendingUsers.length > 0 && (
            <MemberGroup
              label="Assigned — awaiting response"
              labelColor="text-amber-700"
              badge="bg-amber-100 text-amber-700"
              badgeText="Pending"
              users={pendingUsers}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onToggleAll={() => toggleSelectAll(pendingUsers.map(u => u.id))}
            />
          )}
          {completedUsers.length > 0 && (
            <MemberGroup
              label="Completed this round"
              labelColor="text-green-700"
              badge="bg-green-100 text-green-700"
              badgeText="Done"
              users={completedUsers}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onToggleAll={() => toggleSelectAll(completedUsers.map(u => u.id))}
              onDeleteResponse={(userId, name) =>
                setDeleteTarget({ userId, surveyId: viewingSurveyId, name })
              }
            />
          )}
          {notAssigned.length > 0 && (
            <MemberGroup
              label="Not assigned"
              labelColor="text-gray-500"
              badge="bg-gray-100 text-gray-500"
              badgeText="—"
              users={notAssigned}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onToggleAll={() => toggleSelectAll(notAssigned.map(u => u.id))}
            />
          )}
          {allUsers.length === 0 && (
            <p className="text-sm text-muted text-center py-6">No users yet.</p>
          )}
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {roundResponses.length > 0 && (
        <div className="space-y-6">
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Results — {roundResponses.length} response{roundResponses.length !== 1 ? 's' : ''}
            </h3>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setResultsView('by-category')}
                className={`px-3 py-1.5 transition-colors ${resultsView === 'by-category' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                By Question
              </button>
              <button
                onClick={() => setResultsView('by-person')}
                className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${resultsView === 'by-person' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                By Person
              </button>
            </div>
          </div>

          {resultsView === 'by-category' ? (
            <ByCategoryView responses={roundResponses} />
          ) : (
            <ByPersonView
              responses={roundResponses}
              expandedId={expandedId}
              onExpand={id => setExpandedId(expandedId === id ? null : id)}
              onDelete={(userId, surveyId, name) => setDeleteTarget({ userId, surveyId, name })}
            />
          )}
        </div>
      )}

      {roundResponses.length === 0 && (
        <div className="text-center py-16 text-muted text-sm">
          No responses yet for this survey round.
        </div>
      )}
    </div>
  )
}

// ─── By-Category view ─────────────────────────────────────────────────────────
function ByCategoryView({ responses }: { responses: SurveyResponseWithProfile[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const openQuestions = [
    { key: 'wants_to_dig_deeper',   label: 'Which AI concepts, tools, or applications would you like to explore in greater depth?' },
    { key: 'wants_to_explore',      label: 'What new AI tools, experiments, or directions would you like the program to incorporate?' },
    { key: 'feels_confident_about', label: 'In which areas do you feel your understanding or capabilities have most improved?' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Rated categories */}
      {CATEGORIES.map(cat => {
        const ratingKey = `rating_${cat.key}` as `rating_${CategoryKey}`
        const feedbackKey = `feedback_${cat.key}` as `feedback_${CategoryKey}`
        const average = calcAvg(responses, ratingKey)
        const dist    = calcDist(responses, ratingKey)
        const maxDist = Math.max(...dist, 1)
        const isExpanded = expandedKey === cat.key

        // Responses that have a comment for this category
        const commentsWithAuthor = responses
          .map(r => ({
            name: respondentName(r),
            rating: r[ratingKey],
            comment: r[feedbackKey],
          }))
          .filter(c => c.comment && c.comment.trim())

        return (
          <div key={cat.key} className="bg-white border border-border rounded-xl overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpandedKey(isExpanded ? null : cat.key)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cat.question}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {average !== null && (
                    <>
                      <span className="text-lg font-bold text-gray-900">{average.toFixed(1)}</span>
                      <span className="text-gray-300 text-xs">/5</span>
                      <span className="text-sm">
                        <span className="text-yellow-400">{'★'.repeat(Math.round(average))}</span>
                        <span className="text-gray-200">{'★'.repeat(5 - Math.round(average))}</span>
                      </span>
                    </>
                  )}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Mini distribution bar — always visible */}
              <div className="flex items-end gap-1 mt-3 h-6">
                {dist.map((count, i) => {
                  const heightPct = (count / maxDist) * 100
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5 flex-1" title={`${i + 1}★: ${count}`}>
                      <div className="w-full relative" style={{ height: '20px' }}>
                        <div
                          className={`absolute bottom-0 w-full rounded-t transition-all ${
                            count === 0 ? 'bg-gray-100' :
                            i + 1 >= 4 ? 'bg-green-400' :
                            i + 1 === 3 ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`}
                          style={{ height: count === 0 ? '3px' : `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400">{i + 1}★</span>
                    </div>
                  )
                })}
              </div>
            </button>

            {/* Expanded: individual ratings + comments */}
            {isExpanded && (
              <div className="border-t border-border bg-gray-50 px-5 py-4 space-y-2">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">
                  Individual responses ({responses.length})
                </p>
                {responses.map(r => {
                  const rating  = r[ratingKey]
                  const comment = r[feedbackKey]
                  const name    = respondentName(r)
                  return (
                    <div key={r.id} className="bg-white border border-border rounded-lg px-4 py-3 flex gap-3 items-start">
                      <div className="shrink-0 w-28">
                        <p className="text-xs font-medium text-gray-800 truncate" title={name}>{name}</p>
                        <div className="mt-0.5">
                          <Stars rating={rating} />
                        </div>
                        {rating !== null && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{RATING_LABELS[rating] ?? ''}</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {comment && comment.trim() ? (
                          <p className="text-xs text-gray-700 italic">&ldquo;{comment}&rdquo;</p>
                        ) : (
                          <p className="text-xs text-gray-300 italic">No comment left</p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {commentsWithAuthor.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No written comments for this category.</p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Open-ended questions */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-gray-900">Qualitative Answers</p>
          <p className="text-xs text-gray-500 mt-0.5">Open-ended responses, attributed to each respondent</p>
        </div>
        <div className="divide-y divide-border">
          {openQuestions.map(q => {
            const answers = responses
              .map(r => ({ name: respondentName(r), value: r[q.key] }))
              .filter(a => a.value && a.value.trim())

            return (
              <div key={q.key} className="px-5 py-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700">{q.label}</p>
                {answers.length > 0 ? (
                  <div className="space-y-2">
                    {answers.map((a, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">
                          {a.name}
                        </span>
                        <p className="text-xs text-gray-700 flex-1">{a.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 italic">No responses yet.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── By-Person view ────────────────────────────────────────────────────────────
function ByPersonView({
  responses,
  expandedId,
  onExpand,
  onDelete,
}: {
  responses: SurveyResponseWithProfile[]
  expandedId: string | null
  onExpand: (id: string) => void
  onDelete: (userId: string, surveyId: string, name: string) => void
}) {
  return (
    <div className="space-y-2">
      {responses.map(r => {
        const isExpanded = expandedId === r.id
        const name = respondentName(r)
        const date = new Date(r.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })

        return (
          <div key={r.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="flex items-stretch">
              <button
                onClick={() => onExpand(r.id)}
                className="flex-1 text-left px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {CATEGORIES.map(cat => (
                        <div key={cat.key} className="flex items-center gap-1">
                          <span className="text-[10px] text-muted">{cat.label.split(' ')[0]}:</span>
                          <Stars rating={r[`rating_${cat.key}`]} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted">{date}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
              <button
                onClick={() => r.survey_id && onDelete(r.user_id, r.survey_id, name)}
                disabled={!r.survey_id}
                className="px-4 border-l border-border text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete response"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-border bg-gray-50 px-5 py-5 space-y-5">
                {/* Ratings & Comments per category */}
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Ratings &amp; Comments</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.map(cat => {
                      const rating   = r[`rating_${cat.key}`]
                      const feedback = r[`feedback_${cat.key}`]
                      return (
                        <div key={cat.key} className="bg-white border border-border rounded-lg p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{cat.label}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{cat.question}</p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end">
                              <Stars rating={rating} size="md" />
                              {rating !== null && (
                                <span className="text-[10px] text-gray-400 mt-0.5">{RATING_LABELS[rating]}</span>
                              )}
                            </div>
                          </div>
                          {feedback && feedback.trim()
                            ? <p className="text-xs text-gray-600 italic border-t border-gray-100 pt-1.5">&ldquo;{feedback}&rdquo;</p>
                            : <p className="text-xs text-gray-300 border-t border-gray-100 pt-1.5">No written comment</p>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Open-ended answers */}
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Open Answers</p>
                  <div className="space-y-2">
                    {([
                      { label: 'Would like to explore in greater depth', value: r.wants_to_dig_deeper },
                      { label: 'Would like the program to incorporate',  value: r.wants_to_explore },
                      { label: 'Feels most improved in',                 value: r.feels_confident_about },
                    ] as const).map(item => (
                      <div key={item.label} className="bg-white border border-border rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-xs text-gray-700">
                          {item.value && item.value.trim()
                            ? item.value
                            : <span className="text-gray-300 italic">No response</span>
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Member group with checkboxes ─────────────────────────────────────────────
function MemberGroup({
  label, labelColor, badge, badgeText, users, selectedIds, onToggle, onToggleAll, onDeleteResponse,
}: {
  label: string
  labelColor: string
  badge: string
  badgeText: string
  users: UserForSurvey[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onDeleteResponse?: (userId: string, name: string) => void
}) {
  const allSelected = users.every(u => selectedIds.has(u.id))

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onToggleAll}
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            allSelected ? 'bg-primary border-primary' : 'border-gray-300 hover:border-primary'
          }`}
        >
          {allSelected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <span className={`text-xs font-semibold ${labelColor}`}>{label} ({users.length})</span>
      </div>
      <div className="space-y-1 pl-6">
        {users.map(u => {
          const name = u.full_name || u.email
          return (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
              <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={() => onToggle(u.id)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {name}
                    {u.role === 'admin' && (
                      <span className="ml-1.5 text-[10px] font-bold text-purple-600 bg-purple-100 px-1 py-0.5 rounded">Admin</span>
                    )}
                  </p>
                  {u.full_name && <p className="text-xs text-muted truncate">{u.email}</p>}
                </div>
              </label>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${badge}`}>
                {badgeText}
              </span>
              {onDeleteResponse && (
                <button
                  onClick={() => onDeleteResponse(u.id, name)}
                  className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                  title="Delete this person's survey response"
                >
                  Delete response
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

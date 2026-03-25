'use client'

import { useState } from 'react'

const CATEGORIES = [
  { key: 'monday_sessions', label: 'Monday Sessions' },
  { key: 'deliverables',    label: 'Deliverables' },
  { key: 'material',        label: 'Material' },
  { key: 'resources',       label: 'Resources' },
  { key: 'overall',         label: 'Overall' },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

export interface SurveyResponseWithProfile {
  id: string
  user_id: string
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

function barColor(avg: number) {
  if (avg >= 4) return 'bg-green-500'
  if (avg >= 3) return 'bg-yellow-500'
  return 'bg-red-500'
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="text-yellow-500 text-sm leading-none">
      {'★'.repeat(rating)}
      <span className="text-gray-200">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default function AdminSurveyTab({
  responses,
  totalUsers,
}: {
  responses: SurveyResponseWithProfile[]
  totalUsers: number
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const responseRate = totalUsers > 0 ? Math.round((responses.length / totalUsers) * 100) : 0

  const overallAvgNum = responses.length > 0
    ? (() => {
        const vals = responses.map(r => r.rating_overall).filter((v): v is number => v !== null)
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      })()
    : null

  return (
    <div className="space-y-6">

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">{responses.length}</p>
          <p className="text-xs text-muted mt-0.5">Responses</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
          <p className="text-xs text-muted mt-0.5">Response rate ({responses.length}/{totalUsers})</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-5 py-4 min-w-[130px]">
          <p className="text-2xl font-bold text-gray-900">
            {overallAvgNum !== null ? overallAvgNum.toFixed(1) : '—'}
            <span className="text-sm font-normal text-muted">/5</span>
          </p>
          <p className="text-xs text-muted mt-0.5">Avg overall rating</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          No survey responses yet.
        </div>
      ) : (
        <>
          {/* ── Average ratings + distribution ──────────────────────────────── */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Average Ratings</h3>
            <div className="space-y-5">
              {CATEGORIES.map(cat => {
                const ratingKey = `rating_${cat.key}` as `rating_${CategoryKey}`
                const average = calcAvg(responses, ratingKey)
                const dist    = calcDist(responses, ratingKey)
                const maxDist = Math.max(...dist, 1)

                return (
                  <div key={cat.key}>
                    {/* Label + bar + value */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-36 shrink-0">{cat.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        {average !== null && (
                          <div
                            className={`${barColor(average)} h-2.5 rounded-full transition-all duration-500`}
                            style={{ width: `${(average / 5) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-10 text-right shrink-0">
                        {average !== null ? average.toFixed(1) : '—'}
                      </span>
                    </div>

                    {/* Distribution mini chart */}
                    <div className="flex items-end gap-1 mt-2 ml-36 pl-3 h-8">
                      {dist.map((count, i) => {
                        const heightPct = (count / maxDist) * 100
                        const isZero = count === 0
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5 flex-1" title={`${i + 1}★: ${count} response${count !== 1 ? 's' : ''}`}>
                            <div className="w-full relative" style={{ height: '24px' }}>
                              <div
                                className={`absolute bottom-0 w-full rounded-t transition-all ${
                                  isZero ? 'bg-gray-100' :
                                  i + 1 >= 4 ? 'bg-green-400' :
                                  i + 1 === 3 ? 'bg-yellow-400' :
                                  'bg-red-400'
                                }`}
                                style={{ height: isZero ? '3px' : `${heightPct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400">{i + 1}★</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Individual responses ─────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {responses.length} Individual Response{responses.length !== 1 ? 's' : ''}
            </h3>
            <div className="space-y-2">
              {responses.map(r => {
                const isExpanded = expandedId === r.id
                const name = r.profiles?.full_name || r.profiles?.email || 'Unknown'
                const date = new Date(r.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })

                return (
                  <div key={r.id} className="bg-white border border-border rounded-xl overflow-hidden">

                    {/* Collapsed row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
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
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border bg-gray-50 px-5 py-5 space-y-5">

                        {/* Per-category detail */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Ratings &amp; Comments</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => {
                              const rating   = r[`rating_${cat.key}`]
                              const feedback = r[`feedback_${cat.key}`]
                              return (
                                <div key={cat.key} className="bg-white border border-border rounded-lg p-3 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-gray-700">{cat.label}</span>
                                    <Stars rating={rating} />
                                  </div>
                                  {feedback ? (
                                    <p className="text-xs text-muted italic">&ldquo;{feedback}&rdquo;</p>
                                  ) : (
                                    <p className="text-xs text-gray-300">No comment</p>
                                  )}
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
                              { label: 'Wants to dig deeper into', value: r.wants_to_dig_deeper },
                              { label: 'Wants to explore',         value: r.wants_to_explore },
                              { label: 'Feels confident about',    value: r.feels_confident_about },
                            ] as const).map(item => (
                              <div key={item.label} className="bg-white border border-border rounded-lg p-3">
                                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">{item.label}</p>
                                <p className="text-xs text-gray-700">
                                  {item.value || <span className="text-gray-300 italic">No response</span>}
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
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { submitSurvey } from '@/lib/actions/survey'

interface RatingCategory {
  key: string
  label: string
  description: string
}

const RATING_CATEGORIES: RatingCategory[] = [
  {
    key: 'monday_sessions',
    label: 'Monday Sessions',
    description: 'How are the live sessions working for you?',
  },
  {
    key: 'deliverables',
    label: 'Deliverables',
    description: 'How are you finding the assignments and deliverables?',
  },
  {
    key: 'material',
    label: 'Material Presented',
    description: 'How useful and clear is the content and curriculum?',
  },
  {
    key: 'resources',
    label: 'Resources',
    description: 'How valuable are the resources we\'ve provided?',
  },
  {
    key: 'overall',
    label: 'Overall Experience',
    description: 'How would you rate your experience in the program so far?',
  },
]

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
            aria-label={`Rate ${star} out of 5`}
          >
            <span className={active >= star ? 'text-yellow-400' : 'text-gray-600'}>
              ★
            </span>
          </button>
        ))}
      </div>
      {active > 0 && (
        <span className="text-xs text-gray-400 w-16">{RATING_LABELS[active]}</span>
      )}
    </div>
  )
}

export default function SurveyForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [ratings, setRatings] = useState<Record<string, number>>({
    monday_sessions: 0,
    deliverables: 0,
    material: 0,
    resources: 0,
    overall: 0,
  })

  const [feedback, setFeedback] = useState<Record<string, string>>({
    monday_sessions: '',
    deliverables: '',
    material: '',
    resources: '',
    overall: '',
  })

  const [digDeeper, setDigDeeper] = useState('')
  const [explore, setExplore] = useState('')
  const [confident, setConfident] = useState('')

  const allRated = Object.values(ratings).every((r) => r > 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allRated) {
      setError('Please rate all five categories before submitting.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitSurvey({
        rating_monday_sessions: ratings.monday_sessions,
        rating_deliverables: ratings.deliverables,
        rating_material: ratings.material,
        rating_resources: ratings.resources,
        rating_overall: ratings.overall,
        feedback_monday_sessions: feedback.monday_sessions,
        feedback_deliverables: feedback.deliverables,
        feedback_material: feedback.material,
        feedback_resources: feedback.resources,
        feedback_overall: feedback.overall,
        wants_to_dig_deeper: digDeeper,
        wants_to_explore: explore,
        feels_confident_about: confident,
      })
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-10 pb-16">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="text-4xl">👋</div>
        <h1 className="text-2xl font-bold text-gray-100">
          Before you dive in...
        </h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Take a moment to share how your experience has been going.
          Your honest feedback helps us shape the program.
        </p>
      </div>

      {/* Rating Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          How are we doing?
        </h2>
        {RATING_CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-100">{cat.label}</p>
                <p className="text-sm text-gray-400 mt-0.5">{cat.description}</p>
              </div>
              <div className="shrink-0">
                <StarRating
                  value={ratings[cat.key]}
                  onChange={(v) =>
                    setRatings((prev) => ({ ...prev, [cat.key]: v }))
                  }
                />
              </div>
            </div>
            <textarea
              value={feedback[cat.key]}
              onChange={(e) =>
                setFeedback((prev) => ({ ...prev, [cat.key]: e.target.value }))
              }
              placeholder="Any specific thoughts? (optional)"
              rows={2}
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Open-ended Section */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Tell us more
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            What would you like to dig deeper into?
          </label>
          <textarea
            value={digDeeper}
            onChange={(e) => setDigDeeper(e.target.value)}
            placeholder="Topics or concepts you'd like to explore in more depth..."
            rows={3}
            className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            What would you like to explore?
          </label>
          <textarea
            value={explore}
            onChange={(e) => setExplore(e.target.value)}
            placeholder="New areas, tools, or directions you're curious about..."
            rows={3}
            className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            What are you feeling confident about right now?
          </label>
          <textarea
            value={confident}
            onChange={(e) => setConfident(e.target.value)}
            placeholder="Skills, concepts, or areas where you're feeling solid..."
            rows={3}
            className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {isPending ? 'Submitting...' : 'Submit & Continue'}
        </button>
        {!allRated && (
          <p className="text-center text-xs text-gray-500">
            Please rate all five categories to submit
          </p>
        )}
      </div>
    </form>
  )
}

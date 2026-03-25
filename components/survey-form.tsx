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
    label: 'Weekly Sessions',
    description: 'Are the sessions guiding you to test and deepen your understanding of how AI can be integrated into your work and day-to-day?',
  },
  {
    key: 'deliverables',
    label: 'Assignments',
    description: 'Are the assignments giving you meaningful hands-on experience to experiment with AI tools?',
  },
  {
    key: 'material',
    label: 'Curriculum',
    description: 'Is the curriculum providing a broader perspective to explore the effects of AI in the work environment and across different contexts?',
  },
  {
    key: 'resources',
    label: 'Resources',
    description: 'Are the resources enabling you to go beyond a single tool and experiment broadly with AI and all its capabilities?',
  },
  {
    key: 'overall',
    label: 'Overall',
    description: 'Overall, is this program helping you develop a deeper and more up-to-date AI knowledge and understanding of how it connects with your work?',
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
            <span className={active >= star ? 'text-yellow-400' : 'text-gray-300'}>
              ★
            </span>
          </button>
        ))}
      </div>
      {/* Fixed-width label — always rendered to prevent layout shift */}
      <span className={`text-xs w-16 ${active > 0 ? 'text-gray-500' : 'invisible'}`}>
        {RATING_LABELS[active] ?? ''}
      </span>
    </div>
  )
}

export default function SurveyForm({ surveyId, surveyTitle }: { surveyId: string; surveyTitle: string }) {
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
  const allAnswered = allRated && digDeeper.trim() !== '' && explore.trim() !== '' && confident.trim() !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allRated) {
      setError('Please rate all five categories before submitting.')
      return
    }
    if (!allAnswered) {
      setError('Please answer all three open-ended questions before submitting.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitSurvey({
        survey_id: surveyId,
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
        <h1 className="text-2xl font-bold text-gray-900">
          {surveyTitle}
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Take a moment to share how your experience has been going.
          Your honest feedback helps us shape the program.
        </p>
      </div>

      {/* Rating Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          How are we doing?
        </h2>
        {RATING_CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{cat.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
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
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Open-ended Section */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Tell us more
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Which AI concepts, tools, or applications would you like to explore in greater depth?
          </label>
          <textarea
            value={digDeeper}
            onChange={(e) => setDigDeeper(e.target.value)}
            placeholder="e.g. prompt engineering, specific AI models, practical use cases..."
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            What new AI tools, experiments, or directions would you like the program to incorporate?
          </label>
          <textarea
            value={explore}
            onChange={(e) => setExplore(e.target.value)}
            placeholder="e.g. new tools to test, workflows to try, areas not yet covered..."
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            In which areas do you feel your understanding or capabilities have most improved?
          </label>
          <textarea
            value={confident}
            onChange={(e) => setConfident(e.target.value)}
            placeholder="e.g. understanding how LLMs work, using AI in my daily workflow..."
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors shadow-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isPending || !allAnswered}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {isPending ? 'Submitting...' : 'Submit & Continue'}
        </button>
        {!allAnswered && (
          <p className="text-center text-xs text-gray-400">
            {!allRated
              ? 'Rate all five categories and answer all three questions to submit'
              : 'Answer all three open-ended questions to submit'}
          </p>
        )}
      </div>
    </form>
  )
}

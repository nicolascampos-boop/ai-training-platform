export type UserRole = 'admin' | 'user'

// Material tier can be in various formats from database (case-insensitive, with/without spaces)
export type MaterialTier = string  // 'MUST READ' | 'must_read' | 'CORE' | 'core' | 'Optional' | 'optional' | 'Reference' | 'reference'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
  last_login: string | null
  survey_required: boolean
}

export interface Material {
  id: string
  title: string
  description: string | null
  link: string | null
  content_type: string | null
  categories: string[]
  week: string | null
  estimated_time: string | null
  initial_score: number | null
  initial_quality: number | null
  initial_relevance: number | null
  is_essential: boolean
  material_tier: MaterialTier
  justification_for_assignment: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  guidelines: string | null
  columns: string[] | null
  headlines: string[] | null
  tags: string[]
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  material_id: string
  user_id: string
  quality_score: number
  relevance_score: number
  comment: string | null
  created_at: string
  updated_at: string
}

export interface VoteReaction {
  id: string
  vote_id: string
  user_id: string
  reaction: 'like' | 'dislike'
  created_at: string
}

export interface MaterialWithScores extends Material {
  avg_quality: number
  avg_relevance: number
  avg_overall: number
  vote_count: number
  uploader?: Profile
}

export interface WeekContent {
  week: string
  title: string | null
  description: string | null
  objectives: string | null
  homework: string | null
  deliverable_prompt: string | null
  is_enabled: boolean
  updated_at: string
  updated_by: string | null
}

export interface MemberResource {
  id: string
  week: string
  title: string
  link: string
  description: string | null
  added_by: string | null
  created_at: string
  adder?: Profile
}

export interface WeekDeliverable {
  id: string
  user_id: string
  week: string
  link: string | null
  notes: string | null
  submitted_at: string
}

export interface WeekSession {
  id: string
  week: string
  title: string
  link: string
  session_type: 'weekly' | 'team' | 'speaker'
  description: string | null
  session_date: string | null
  created_by: string | null
  created_at: string
}

export const SESSION_TYPE_META: Record<string, { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }> = {
  weekly:  { label: 'Weekly Session',  icon: '🎬', bgColor: 'bg-blue-50',   textColor: 'text-blue-700',   borderColor: 'border-blue-200'   },
  team:    { label: 'Team Session',    icon: '👥', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
  speaker: { label: 'Speaker Session', icon: '🎤', bgColor: 'bg-amber-50',  textColor: 'text-amber-700',  borderColor: 'border-amber-200'  },
}

export const CATEGORIES = [
  'AI Fundamentals',
  'Implementation Strategy',
  'Applied Use Cases',
  'Agent Development',
  'Workflow Automation',
  'AI-Assisted Coding',
  'Platform Deep-Dives',
  'UX Design',
  'Prompt Engineering',
  'Organizational Impact',
  'Research Methodology',
  'Conversation Design',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CONTENT_TYPES = [
  'Video',
  'Documentation',
  'Course',
  'Platform',
  'Community',
  'Social Media Post',
  'Article',
  'Case Study',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export const WEEKS = [
  'Week 1',
  'Week 2',
  'Week 3',
  'Week 4',
  'Week 5',
  'Week 6',
  'Week 7',
  'Week 8',
  'Week 9',
  'Reference',
] as const

export const WEEK_DESCRIPTIONS: Record<string, string> = {
  'Week 1': 'AI Foundations & Strategic Thinking',
  'Week 2': 'Prompt Engineering & Practical Skills',
  'Week 3': 'Workflow Automation & Productivity',
  'Week 4': 'Advanced Applications & Product Use Cases',
  'Week 5': 'AI-Assisted Development & Coding',
  'Week 6': 'Organizational Impact & Change Management',
  'Week 7': 'Advanced AI Systems & Architecture',
  'Week 8': 'Scaling AI Across Teams & Processes',
  'Week 9': 'Capstone — Synthesis & Future Directions',
  'Reference': 'Tools, Platforms & Ongoing Resources',
}

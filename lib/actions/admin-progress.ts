'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Admin access required')
  return user
}

// ─── Material Views ──────────────────────────────────────────────────────────

export async function adminRecordView(
  targetUserId: string,
  materialId: string,
  materialWeek: string | null
) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('material_views')
    .insert({
      user_id: targetUserId,
      material_id: materialId,
      material_week: materialWeek,
      source: 'other',
      viewed_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function adminRemoveViews(
  targetUserId: string,
  materialId: string
) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('material_views')
    .delete()
    .eq('user_id', targetUserId)
    .eq('material_id', materialId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// ─── Votes ───────────────────────────────────────────────────────────────────

export async function adminUpsertVote(
  targetUserId: string,
  materialId: string,
  qualityScore: number,
  relevanceScore: number,
  comment?: string
) {
  await requireAdmin()

  if (qualityScore < 1 || qualityScore > 5 || relevanceScore < 1 || relevanceScore > 5) {
    return { error: 'Scores must be between 1 and 5' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('votes')
    .upsert(
      {
        material_id: materialId,
        user_id: targetUserId,
        quality_score: qualityScore,
        relevance_score: relevanceScore,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'material_id,user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function adminRemoveVote(
  targetUserId: string,
  materialId: string
) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('votes')
    .delete()
    .eq('user_id', targetUserId)
    .eq('material_id', materialId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// ─── Deliverables ────────────────────────────────────────────────────────────

export async function adminUpsertDeliverable(
  targetUserId: string,
  week: string,
  link?: string,
  notes?: string
) {
  await requireAdmin()

  const trimmedLink = link?.trim() || ''
  const trimmedNotes = notes?.trim() || ''

  if (!trimmedLink && !trimmedNotes) {
    return { error: 'At least a link or notes required' }
  }

  if (trimmedLink) {
    try { new URL(trimmedLink) } catch { return { error: 'Invalid URL format' } }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('week_deliverables')
    .upsert(
      {
        user_id: targetUserId,
        week,
        link: trimmedLink || null,
        notes: trimmedNotes || null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week' }
    )

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function adminRemoveDeliverable(
  targetUserId: string,
  week: string
) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('week_deliverables')
    .delete()
    .eq('user_id', targetUserId)
    .eq('week', week)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Auto-create profile if it doesn't exist (e.g. user existed before DB reset)
  if (!profile) {
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        last_login: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !newProfile) redirect('/login')
    profile = newProfile
  } else {
    // Update last_login timestamp (fire and forget, don't block rendering)
    supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {}) // Silently ignore errors
  }

  return (
    <div className="min-h-screen">
      <Sidebar profile={profile} />
      <main className="lg:ml-64 pt-16 px-4 pb-4 md:p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}

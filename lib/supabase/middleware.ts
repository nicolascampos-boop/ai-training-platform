import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Forward pathname so server components (e.g. layout) can read it via headers()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth')

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Survey gate ────────────────────────────────────────────────────────────
  // Runs on every request so client-side navigation cannot bypass it.
  // Skip the gate for the survey page itself and non-app routes.
  if (user && pathname !== '/survey' && !isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('survey_required')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.survey_required) {
      const { data: activeSurvey } = await supabase
        .from('surveys')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      if (activeSurvey) {
        const { data: surveyDone } = await supabase
          .from('survey_responses')
          .select('id')
          .eq('user_id', user.id)
          .eq('survey_id', activeSurvey.id)
          .maybeSingle()

        if (!surveyDone) {
          const url = request.nextUrl.clone()
          url.pathname = '/survey'
          return NextResponse.redirect(url)
        }
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return supabaseResponse
}

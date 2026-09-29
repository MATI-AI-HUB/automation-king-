import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ROLES = ['admin', 'chief_editor', 'desk_editor']
const AAL2_ROLES = new Set(['admin', 'chief_editor'])

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApiRoute = path.startsWith('/api/admin')
  const deskEditorRequiresAal2 = process.env.DESK_EDITOR_REQUIRE_AAL2 === 'true'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'auth_unconfigured' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    let user = (await supabase.auth.getUser()).data.user

    if (!user) {
      const authHeader = request.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim()
        const { data } = await supabase.auth.getUser(token)
        user = data.user
      }
    }

    if (!user) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: 'unauthorized' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectedFrom', path)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: 'forbidden' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    const needsAal2 = AAL2_ROLES.has(profile.role) || (profile.role === 'desk_editor' && deskEditorRequiresAal2)
    if (needsAal2) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel !== 'aal2') {
        if (isApiRoute) {
          return NextResponse.json(
            { error: 'mfa_required' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } },
          )
        }
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.searchParams.set('redirectedFrom', path)
        loginUrl.searchParams.set('mfa', '1')
        return NextResponse.redirect(loginUrl)
      }
    }

    return supabaseResponse
  } catch {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'auth_unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

// Supabase session refresh, from the root proxy.ts on main. With a src/ folder, Next only
// runs src/proxy.ts, so this is kept as a helper for src/proxy.ts to call once
// DATA_SOURCE=supabase is wired up (integration step). Not called yet.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshes the token and rewrites the cookies. do not remove.
  await supabase.auth.getUser()

  return response
}

// Paths the session refresh should run on (from the original proxy.ts). Merge into
// src/proxy.ts's matcher during integration.
export const sessionMatcher = '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'

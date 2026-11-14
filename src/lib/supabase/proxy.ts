// Supabase session refresh, called from src/proxy.ts when DATA_SOURCE=supabase.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session cookies if needed and reports who is signed in.
 * Always return (or copy cookies from) `response`, or a refreshed session is lost.
 */
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

  // Verifies the JWT and refreshes the token when it's close to expiring. Do not remove.
  const { data } = await supabase.auth.getClaims()
  const userId = (data?.claims?.sub as string | undefined) ?? null

  return { response, userId }
}

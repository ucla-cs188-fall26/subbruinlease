import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Only same-origin relative paths. Rejects protocol-relative (//evil.com),
// backslash tricks (/\evil.com) and absolute URLs, any of which would turn a
// valid magic link into an off-site redirect after sign-in.
function safeNext(raw: string | null): string {
  if (!raw || raw === '/') return '/'
  if (!/^\/[^/\\]/.test(raw)) return '/'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) redirect(next)
  }

  redirect('/?error=link_expired')
}

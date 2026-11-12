const ORIGIN = 'https://subbruinlease.invalid'

// Turns an untrusted `next` query value into a same-origin path, or '/'.
// Covered by scripts/test-safe-next.mjs (npm run test:redirect).
export function safeNext(raw: string | null): string {
  if (!raw) return '/'

  // Reject control characters outright. A URL-encoded tab or newline is
  // stripped later by the URL parser or the browser, which can turn
  // "/\t/evil.com" back into "//evil.com".
  if (/[\x00-\x1f\x7f]/.test(raw)) return '/'

  // Resolve against a throwaway origin, keep only same-origin results, and
  // return the parsed parts rather than the input.
  let url: URL
  try {
    url = new URL(raw, ORIGIN)
  } catch {
    return '/'
  }
  if (url.origin !== ORIGIN) return '/'

  // Resolving collapses dot segments, so "/.//evil.com" passes the check
  // above but leaves the pathname as "//evil.com", which a browser reads as
  // another host. Re-check the value we are about to return. One pass is
  // enough: the first parse already removed every dot segment.
  const out = url.pathname + url.search + url.hash
  if (new URL(out, ORIGIN).origin !== ORIGIN) return '/'
  return out
}

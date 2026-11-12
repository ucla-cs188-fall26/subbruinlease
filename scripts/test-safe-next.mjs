// Redirect-safety test for safeNext (the auth callback's `next` handling).
// Imports the real function; Node strips the TypeScript types natively.
// Run: npm run test:redirect
import { safeNext } from '../lib/auth/safe-next.ts'

const BASE = 'https://subbruinlease.example/auth/confirm'
const HOST = new URL(BASE).host

// Each value is the query-string form of `next`, decoded the same way the
// route decodes it (URLSearchParams), so %09 arrives as a real tab.
const benign = ['/listings/123', '/explore?page=2', '/a/b#frag', '/']

const hostile = [
  '//evil.com',
  '/\\evil.com',
  'https://evil.com',
  'javascript:alert(1)',
  '/%09/evil.com',
  '/%0a/evil.com',
  '/%00/evil.com',
  '/%09%09/evil.com',
  '/%2F/evil.com',
  '/x/..//evil.com',
  '/.//evil.com',
  '/a/../..//evil.com',
  '/%2e//evil.com',
  '/%2e%2e//evil.com',
  '/x/..%2F/evil.com',
  '/././/evil.com',
  '/..//..//evil.com',
  '/%2e%2e%2f%2fevil.com',
  '////evil.com',
  '\t//evil.com', // literal tab, not encoded
]

const decode = (q) => new URLSearchParams('next=' + q).get('next')
const show = (s) => JSON.stringify(s)

const rows = []
let failures = 0

for (const q of [...benign, ...hostile]) {
  const raw = decode(q)
  const out = safeNext(raw)
  const host = new URL(out, BASE).host
  const problems = []
  if (host !== HOST) problems.push('ESCAPES to ' + host)
  if (benign.includes(q) && out !== raw) problems.push('benign path altered')
  if (problems.length) failures++
  rows.push([show(q), show(out), host, problems.length ? 'FAIL: ' + problems.join('; ') : 'ok'])
}

const head = ['next=', 'safeNext returns', 'resolves to', 'result']
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join('  ')
console.log(line(head))
console.log(widths.map((w) => '-'.repeat(w)).join('  '))
rows.forEach((r) => console.log(line(r)))
console.log(`\n${rows.length} cases, ${failures} failed`)

process.exit(failures ? 1 : 0)

// Dev-only probe: find which monitoring table is missing in the live project.
// Reads creds from backend/.env.local (never prints them).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('backend/.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env.local')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

const probes = [
  ['scans (select)', () => admin.from('scans').select('id', { count: 'exact', head: true })],
  ['admin_incidents (select *)', () => admin.from('admin_incidents').select('*').order('started_at', { ascending: false })],
  ['scans queued (count)', () => admin.from('scans').select('id', { count: 'exact', head: true }).eq('status', 'queued')],
  ['scans processing (count)', () => admin.from('scans').select('id', { count: 'exact', head: true }).eq('status', 'processing')],
  ['profiles (count)', () => admin.from('profiles').select('user_id', { count: 'exact', head: true })],
  ['waitlist_applications (count)', () => admin.from('waitlist_applications').select('id', { count: 'exact', head: true })],
  ['audit_logs (count)', () => admin.from('audit_logs').select('id', { count: 'exact', head: true })],
  ['storage bucket provance-uploads (list)', () => admin.storage.from('provance-uploads').list('', { limit: 1 })],
]

for (const [label, fn] of probes) {
  try {
    const { data, error, count } = await fn()
    console.log(`${error ? 'FAIL' : 'ok  '}  ${label}${error ? `  -> ${error.message}` : `  (count=${count ?? (Array.isArray(data) ? data.length : 'n/a')})`}`)
  } catch (err) {
    console.log(`ERR   ${label}  -> ${err.message}`)
  }
}

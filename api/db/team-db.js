import { execSync } from 'child_process'

/**
 * team-db wrapper: executes SQL against the shared Turso database
 * Pass a single SQL statement as a quoted string.
 */
export function teamDb(sql) {
  const escaped = sql.replace(/"/g, '\\"').replace(/\n/g, ' ')
  const result = execSync(`team-db "${escaped}"`, {
    encoding: 'utf-8',
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30000,
  })
  return JSON.parse(result.trim())
}

/**
 * Execute a raw SQL statement (no return value expected).
 * Used for INSERT/UPDATE/DELETE where we don't need results.
 */
export function teamDbExec(sql) {
  const escaped = sql.replace(/"/g, '\\"').replace(/\n/g, ' ')
  execSync(`team-db "${escaped}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30000,
  })
}
import { teamDbExec } from './team-db.js'

/**
 * Initialize the Turso/SQLite schema for Provance.
 * Creates all tables if they don't exist:
 * - users (auth + profile)
 * - organizations (multi-tenant/team)
 * - scans (media verification records)
 * - signals (forensic signal breakdown per scan)
 * - reports (generated PDF artifacts)
 * - audit_logs (immutable action trail)
 */
export async function initDb() {
  console.log('[Provance DB] Initializing schema...')

  teamDbExec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT DEFAULT 'trial',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  teamDbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      org_id TEXT REFERENCES organizations(id),
      role TEXT DEFAULT 'member',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  teamDbExec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      org_id TEXT REFERENCES organizations(id),
      media_hash TEXT NOT NULL,
      media_type TEXT NOT NULL,
      filename TEXT,
      file_size INTEGER,
      duration_sec INTEGER,
      status TEXT DEFAULT 'pending',
      verdict TEXT,
      confidence REAL,
      methodology_ver TEXT,
      storage_path TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  teamDbExec(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      signal_name TEXT NOT NULL,
      category TEXT NOT NULL,
      confidence REAL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  teamDbExec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      pdf_path TEXT,
      methodology_ver TEXT,
      generated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  teamDbExec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  console.log('[Provance DB] Schema ready: organizations, users, scans, signals, reports, audit_logs')
}
import { Hono } from 'hono'
import { verify } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { teamDb } from '../db/team-db.js'
import { createHash } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const JWT_SECRET = process.env.JWT_SECRET || 'provance-dev-secret-key-2026'
const UPLOADS_DIR = join(process.cwd(), 'api', 'uploads')

const router = new Hono()

/**
 * JWT auth middleware — extracts user from Bearer token.
 * Sets c.get('userId') and c.get('userEmail') for downstream handlers.
 */
async function authGuard(c, next) {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — missing or invalid token' }, 401)
  }
  try {
    const payload = verify(auth.slice(7), JWT_SECRET)
    c.set('userId', payload.sub)
    c.set('userEmail', payload.email)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

/**
 * POST /api/scans
 * Upload media file, hash it, store to disk, and queue a scan.
 * Accepts multipart/form-data with a 'file' field.
 */
router.post('/', authGuard, async (c) => {
  try {
    const userId = c.get('userId')
    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file) {
      return c.json({ error: 'No file provided. Send a file in the "file" field.' }, 400)
    }

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const mediaHash = createHash('sha256').update(buffer).digest('hex')
    const filename = file.name || `upload-${mediaHash.slice(0, 8)}`
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin'

    // Determine media type
    const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v']
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif']
    const isVideo = videoExts.includes(ext)
    const isImage = imageExts.includes(ext)

    if (!isVideo && !isImage) {
      return c.json({ error: `Unsupported file type '.${ext}'. Supported: ${[...imageExts, ...videoExts].join(', ')}` }, 400)
    }

    const mediaType = isVideo ? 'video' : 'image'

    // Store to disk
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true })
    }
    const storagePath = join(UPLOADS_DIR, `${mediaHash}.${ext}`)
    await writeFile(storagePath, buffer)

    // Create scan record
    const scanId = uuidv4()
    const now = new Date().toISOString().replace('T', ' ').split('.')[0]

    teamDb(`INSERT INTO scans (id, user_id, media_hash, media_type, filename, file_size, status, storage_path, created_at)
            VALUES ('${scanId}', '${userId}', '${mediaHash}', '${mediaType}', '${filename.replace(/'/g, "''")}', ${buffer.length}, 'pending', '${storagePath}', '${now}')`)

    // Audit log
    teamDb(`INSERT INTO audit_logs (id, user_id, action, details)
            VALUES ('${uuidv4()}', '${userId}', 'scan.created', '{"scan_id":"${scanId}","media_type":"${mediaType}","file_size":${buffer.length},"media_hash":"${mediaHash}"}')`)

    return c.json({
      scanId,
      status: 'pending',
      mediaType,
      filename,
      fileSize: buffer.length,
      mediaHash,
      message: 'File uploaded. Scan queued for processing.',
    }, 201)
  } catch (err) {
    console.error('[Scans] Upload error:', err)
    return c.json({ error: 'Upload failed', details: err.message }, 500)
  }
})

/**
 * GET /api/scans
 * List the current user's scan history (most recent 50).
 */
router.get('/', authGuard, async (c) => {
  const userId = c.get('userId')
  const scans = teamDb(`SELECT id, media_type, filename, file_size, status, verdict, confidence, created_at, completed_at
                        FROM scans WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 50`)
  return c.json({ scans })
})

/**
 * GET /api/scans/:id
 * Get full scan detail including forensic signals.
 */
router.get('/:id', authGuard, async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const scans = teamDb(`SELECT * FROM scans WHERE id = '${id}' AND user_id = '${userId}'`)
  if (scans.length === 0) {
    return c.json({ error: 'Scan not found' }, 404)
  }
  const signals = teamDb(`SELECT * FROM signals WHERE scan_id = '${id}'`)
  return c.json({ scan: scans[0], signals })
})

/**
 * GET /api/scans/:id/status
 * Lightweight status poll for long-running scans (video).
 */
router.get('/:id/status', authGuard, async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const scans = teamDb(`SELECT id, status, started_at, completed_at FROM scans WHERE id = '${id}' AND user_id = '${userId}'`)
  if (scans.length === 0) {
    return c.json({ error: 'Scan not found' }, 404)
  }
  return c.json(scans[0])
})

/**
 * DELETE /api/scans/:id
 * Delete a scan record and associated signals.
 */
router.delete('/:id', authGuard, async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  teamDb(`DELETE FROM signals WHERE scan_id = '${id}'`)
  teamDb(`DELETE FROM scans WHERE id = '${id}' AND user_id = '${userId}'`)
  teamDb(`INSERT INTO audit_logs (id, user_id, action, details) VALUES ('${uuidv4()}', '${userId}', 'scan.deleted', '{"scan_id":"${id}"}')`)
  return c.json({ message: 'Scan deleted' })
})

export { router as scansRoute }
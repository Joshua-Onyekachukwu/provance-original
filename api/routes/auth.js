import { Hono } from 'hono'
import { sign, verify } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { teamDb } from '../db/team-db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'provance-dev-secret-key-2026'

const router = new Hono()

/**
 * POST /api/auth/signup
 * Creates a new user account. Returns JWT token + user profile.
 */
router.post('/signup', async (c) => {
  try {
    const { email, name, password } = await c.req.json()

    if (!email || !name || !password) {
      return c.json({ error: 'Email, name, and password are required' }, 400)
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const existing = teamDb(`SELECT id FROM users WHERE email = '${email}'`)
    if (existing.length > 0) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const id = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)

    teamDb(`INSERT INTO users (id, email, name, password_hash, role) VALUES ('${id}', '${email}', '${name.replace(/'/g, "''")}', '${passwordHash}', 'member')`)

    const token = sign({ sub: id, email, role: 'member' }, JWT_SECRET, { expiresIn: '7d' })

    return c.json({
      token,
      user: { id, email, name, role: 'member' },
      message: 'Account created successfully',
    }, 201)
  } catch (err) {
    console.error('[Auth] Signup error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * POST /api/auth/signin
 * Authenticates existing user with email + password.
 */
router.post('/signin', async (c) => {
  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const users = teamDb(`SELECT id, email, name, password_hash, role FROM users WHERE email = '${email}'`)
    if (users.length === 0) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const token = sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

    // Log signin
    teamDb(`INSERT INTO audit_logs (id, user_id, action, details) VALUES ('${uuidv4()}', '${user.id}', 'auth.signin', '{"email":"${user.email}"}')`)

    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'Signed in successfully',
    })
  } catch (err) {
    console.error('[Auth] Signin error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * POST /api/auth/signout
 * Client-side stateless signout (token invalidation is future scope).
 */
router.post('/signout', async (c) => {
  return c.json({ message: 'Signed out successfully' })
})

/**
 * GET /api/auth/me
 * Returns current user profile from JWT token.
 */
router.get('/me', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = verify(auth.slice(7), JWT_SECRET)
    const users = teamDb(`SELECT id, email, name, role, org_id, created_at FROM users WHERE id = '${payload.sub}'`)
    if (users.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json({ user: users[0] })
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

export { router as authRoute }
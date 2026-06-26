import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoute } from './routes/auth.js'
import { scansRoute } from './routes/scans.js'
import { initDb } from './db/schema.js'

const app = new Hono()

app.use('/api/*', cors())

app.use('/api/*', async (c, next) => {
  c.set('startTime', Date.now())
  await next()
})

app.route('/api/auth', authRoute)
app.route('/api/scans', scansRoute)

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'provance-api', version: '0.1.0' })
})

const PORT = 3001

initDb()
  .then(() => {
    console.log(`[Provance API] Database initialized`)
    serve({ fetch: app.fetch, port: PORT }, (info) => {
      console.log(`[Provance API] Running on http://127.0.0.1:${info.port}`)
    })
  })
  .catch((err) => {
    console.error(`[Provance API] Failed to initialize database:`, err)
    process.exit(1)
  })
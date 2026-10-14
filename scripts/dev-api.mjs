// Local runner for the Vercel functions in /api, on the port vite.config.js proxies to (3001).
// Usage: npm run dev:api        (reads .env, then .env.local)
//        npm run dev:api:test   (reads .env.test.local only: the synthetic test project)
// Implements the small part of Vercel's req/res helpers the handlers use.

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.API_PORT || 3001)
const MAX_BODY = 5 * 1024 * 1024

function resolveHandler(urlPath) {
  const rel = urlPath.replace(/^\/api\//, '').replace(/\/$/, '')
  if (!rel || !/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(rel)) return null
  return path.join(ROOT, 'api', `${rel}.js`)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy() }
      else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res }
  res.json = obj => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res }
  res.send = data => { res.end(data); return res }

  const url = new URL(req.url, 'http://localhost')
  const file = resolveHandler(url.pathname)
  if (!file) return res.status(404).json({ error: 'Not found' })

  let mod
  try { mod = await import(pathToFileURL(file).href) } catch { return res.status(404).json({ error: 'Not found' }) }

  try {
    const raw = await readBody(req)
    const type = req.headers['content-type'] || ''
    if (type.includes('application/json')) {
      try { req.body = raw.length ? JSON.parse(raw.toString('utf8')) : {} } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
    } else {
      req.body = raw.length ? raw : undefined
    }
    await mod.default(req, res)
  } catch (err) {
    if (err.code === 413) return res.status(413).json({ error: 'Request too large' })
    console.error(`[dev-api] ${url.pathname}:`, err.message)
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' })
  }
  console.log(`[dev-api] ${req.method} ${url.pathname} ${res.statusCode}`)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev-api] serving /api on http://127.0.0.1:${PORT}`)
})

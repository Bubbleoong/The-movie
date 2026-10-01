import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../dist-server/server/app.js'
import { databasePool } from '../dist-server/server/database/config.js'

// Exercise the real Express routes/controllers/services without creating users,
// sending emails, or modifying the production database.
process.env.NODE_ENV = 'test'
process.env.APP_ORIGIN = 'https://movie.example'
process.env.VITE_SUPABASE_URL = 'https://supabase.example'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-public-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
const pool = databasePool()
const originalQuery = pool.query
pool.query = async (_sql, values) => ({ rows: [{ exists: values?.[0] === 'existing@example.com' }] })
const realFetch = globalThis.fetch
const upstream = []
const token = 'test.access.token'
const session = { access_token: token, refresh_token: 'refresh', expires_in: 3600, user: { id: 'user-1', email: 'new@example.com' } }
globalThis.fetch = async (url, options = {}) => {
  if (!String(url).startsWith('https://supabase.example/')) return realFetch(url, options)
  const path = new URL(url).pathname
  const body = options.body ? JSON.parse(options.body) : null
  upstream.push({ url: String(url), method: options.method, body, headers: options.headers })
  if (path.endsWith('/signup')) return Response.json({ id: 'user-1', email: body.email })
  if (path.endsWith('/token')) {
    if (body.password === 'wrong-password') return Response.json({ error_code: 'invalid_credentials' }, { status: 400 })
    return Response.json(session)
  }
  if (path.endsWith('/verify')) {
    if (body.token_hash === 'expired-token-hash') return Response.json({ error_code: 'otp_expired' }, { status: 403 })
    return Response.json(session)
  }
  if (path.endsWith('/user')) return Response.json(session.user)
  if (path.endsWith('/recover')) return Response.json({})
  if (path.endsWith('/logout')) return new Response(null, { status: 204 })
  if (path.endsWith('/favorites')) {
    if (options.method !== 'GET') return new Response(null, { status: 204 })
    return Response.json([{ media_type: 'movie', tmdb_id: 42, created_at: '2026-01-01T00:00:00Z' }])
  }
  throw new Error(`Unexpected upstream path ${path}`)
}
const server = createApp().listen(0, '127.0.0.1')
await once(server, 'listening')
const base = `http://127.0.0.1:${server.address().port}`
let passed = 0
async function request(method, path, body, headers = {}) {
  const response = await realFetch(base + path, {
    method, headers: { Origin: base, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: response.status, body: await response.json(), cookies: response.headers.getSetCookie() }
}
async function check(name, action) {
  await action()
  passed++
  console.log(`PASS ${name}`)
}
try {
  for (const [method, path, status] of [
    ['GET', '/api/health', 200], ['GET', '/api/auth/me', 200],
    ['POST', '/api/auth/signup', 400], ['POST', '/api/auth/login', 400],
    ['POST', '/api/auth/recover', 400], ['POST', '/api/auth/reset-password', 400],
    ['GET', '/api/titles/popular?mediaType=invalid', 400], ['GET', '/api/titles/search', 400],
    ['PUT', '/api/favorites/invalid/1', 400], ['GET', '/api/titles/invalid/1/reviews', 400],
    ['GET', '/api/unknown', 501],
  ]) {
    await check(`${method} ${path}`, async () => {
      const result = await request(method, path, ['POST', 'PUT'].includes(method) ? {} : undefined)
      assert.equal(result.status, status)
      if (status >= 400) assert.ok(result.body.error.code)
    })
  }
  await check('Reject foreign Origin', async () => {
    assert.equal((await request('POST', '/api/auth/login', {}, { Origin: 'https://other.example' })).status, 403)
  })
  await check('Duplicate signup returns ACCOUNT_EXISTS without calling Supabase', async () => {
    const count = upstream.length
    const result = await request('POST', '/api/auth/signup', { email: 'existing@example.com', password: 'valid-password' })
    assert.equal(result.status, 409)
    assert.equal(result.body.error.code, 'ACCOUNT_EXISTS')
    assert.match(result.body.error.message, /มีบัญชีอยู่แล้ว/)
    assert.equal(upstream.length, count)
  })
  await check('New signup requires email confirmation', async () => {
    const result = await request('POST', '/api/auth/signup', { email: 'new@example.com', password: 'valid-password' })
    assert.equal(result.status, 201)
    assert.equal(result.body.data.requiresEmailConfirmation, true)
  })
  await check('Login sets HttpOnly cookies and returns user without tokens', async () => {
    const result = await request('POST', '/api/auth/login', { email: 'new@example.com', password: 'valid-password' })
    assert.equal(result.status, 200)
    assert.equal(result.body.data.id, 'user-1')
    assert.equal(result.body.data.access_token, undefined)
    assert.equal(result.cookies.length, 2)
    assert.ok(result.cookies.every(cookie => cookie.includes('HttpOnly') && cookie.includes('Path=/api')))
  })
  await check('Invalid login returns readable credentials error', async () => {
    const result = await request('POST', '/api/auth/login', { email: 'new@example.com', password: 'wrong-password' })
    assert.equal(result.status, 401)
    assert.equal(result.body.error.code, 'INVALID_CREDENTIALS')
  })
  await check('Recovery uses configured public reset URL', async () => {
    const result = await request('POST', '/api/auth/recover', { email: 'new@example.com' })
    assert.equal(result.status, 200)
    assert.equal(new URL(upstream.at(-1).url).searchParams.get('redirect_to'), 'https://movie.example/reset-password')
  })
  await check('Token-hash reset verifies, updates password, then signs out', async () => {
    const start = upstream.length
    const result = await request('POST', '/api/auth/reset-password', { tokenHash: 'valid-token-hash-123', password: 'new-password' })
    assert.equal(result.status, 200)
    const calls = upstream.slice(start)
    assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/auth/v1/verify', '/auth/v1/user', '/auth/v1/logout'])
    assert.equal(calls[0].body.type, 'recovery')
    assert.equal(calls[1].method, 'PUT')
    assert.equal(calls[1].headers.Authorization, `Bearer ${token}`)
    assert.equal(calls[1].body.password, 'new-password')
    assert.equal(result.cookies.length, 2)
  })
  await check('Expired recovery link returns RESET_LINK_INVALID', async () => {
    const result = await request('POST', '/api/auth/reset-password', { tokenHash: 'expired-token-hash', password: 'new-password' })
    assert.equal(result.status, 400)
    assert.equal(result.body.error.code, 'RESET_LINK_INVALID')
  })
  await check('Recovery access-token flow still works', async () => {
    assert.equal((await request('POST', '/api/auth/reset-password', { accessToken: token, password: 'new-password' })).status, 200)
  })
  await check('Favorite repository maps persistence fields for frontend', async () => {
    const result = await request('GET', '/api/favorites', undefined, { Cookie: `movie_access=${token}` })
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.data[0], { mediaType: 'movie', tmdbId: 42, createdAt: '2026-01-01T00:00:00Z' })
  })
  console.log(`Passed ${passed} backend checks (mocked external services).`)
} finally {
  globalThis.fetch = realFetch
  pool.query = originalQuery
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  await pool.end()
}

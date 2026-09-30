import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import pg from 'pg'

const { DATABASE_URL, API_KEY } = dotenv.parse(readFileSync('.env'))
if (!DATABASE_URL || !API_KEY) throw new Error('DATABASE_URL or API_KEY missing')
const url = new URL(DATABASE_URL)
const client = new pg.Client({
  host: url.hostname,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  ssl: { rejectUnauthorized: true, ca: readFileSync('supabase/ca.crt', 'utf8') },
  connectionTimeoutMillis: 8000,
})

try {
  await client.connect()
  await client.query('begin')
  const existing = await client.query('select count(*)::integer as count from vault.secrets where name = $1', ['tmdb_api_key'])
  if (existing.rows[0].count !== 0) throw new Error('tmdb_api_key already exists; refused to overwrite')
  await client.query('select vault.create_secret($1, $2, $3)', [API_KEY, 'tmdb_api_key', 'Server-only TMDB API key'])
  const check = await client.query('select count(*)::integer as count from vault.decrypted_secrets where name = $1 and decrypted_secret = $2', ['tmdb_api_key', API_KEY])
  if (check.rows[0].count !== 1) throw new Error('Vault verification failed')
  await client.query('commit')
  console.log(JSON.stringify({ stored: true, name: 'tmdb_api_key', verified: true }))
} catch (error) {
  await client.query('rollback').catch(() => {})
  console.error(JSON.stringify({ stored: false, code: error?.code ?? 'VAULT_ERROR' }))
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}

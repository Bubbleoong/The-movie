import { existsSync, readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import pg from 'pg'

const { DATABASE_URL } = dotenv.parse(readFileSync('.env'))
if (!DATABASE_URL || !existsSync('supabase/ca.crt')) throw new Error('DATABASE_URL or Supabase CA missing')
const url = new URL(DATABASE_URL)
const migrationName = '20260930000000_create_favorites_reviews'
const sql = readFileSync(`supabase/migrations/${migrationName}.sql`, 'utf8')
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
  const state = await client.query(`select
    to_regclass('public.favorites') is not null as favorites,
    to_regclass('public.reviews') is not null as reviews,
    to_regclass('app_private.site_admins') is not null as admins,
    (select count(*)::integer from auth.users) as users`)
  if (state.rows[0].favorites || state.rows[0].reviews || state.rows[0].admins) throw new Error('Schema objects already exist; migration aborted')
  if (state.rows[0].users !== 1) throw new Error('Expected exactly one Auth user for initial admin; migration aborted')
  await client.query(sql)
  await client.query(`create schema if not exists supabase_migrations`)
  await client.query(`create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text
  )`)
  const existing = await client.query('select 1 from supabase_migrations.schema_migrations where version = $1', ['20260930000000'])
  if (existing.rowCount) throw new Error('Migration version already recorded; aborted')
  await client.query('insert into supabase_migrations.schema_migrations(version, statements, name) values ($1, $2, $3)', [
    '20260930000000', [sql], 'create_favorites_reviews',
  ])
  const admin = await client.query(`insert into app_private.site_admins(user_id)
    select id from auth.users returning user_id`)
  if (admin.rowCount !== 1) throw new Error('Admin assignment failed; aborted')
  await client.query('commit')
  console.log(JSON.stringify({ applied: true, migration: migrationName, initialAdminAssigned: true }))
} catch (error) {
  await client.query('rollback').catch(() => {})
  console.error(JSON.stringify({ applied: false, code: error?.code ?? 'MIGRATION_ERROR', message: error?.message?.includes('aborted') ? error.message : undefined }))
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}

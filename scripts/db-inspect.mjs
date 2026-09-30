import { existsSync, readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import pg from 'pg'

const { DATABASE_URL } = dotenv.parse(readFileSync('.env'))
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env')
  process.exitCode = 1
} else {
  const url = new URL(DATABASE_URL)
  const connectionUrl = new URL(DATABASE_URL)
  if (process.env.DB_CONNECT_MODE === 'direct') {
    const ref = decodeURIComponent(url.username).replace(/^postgres\./, '')
    connectionUrl.hostname = `db.${ref}.supabase.co`
    connectionUrl.username = 'postgres'
    connectionUrl.port = '5432'
  }
  const caFile = 'supabase/ca.crt'
  const client = new pg.Client({
    host: connectionUrl.hostname,
    port: Number(connectionUrl.port || 5432),
    user: decodeURIComponent(connectionUrl.username),
    password: decodeURIComponent(connectionUrl.password),
    database: decodeURIComponent(connectionUrl.pathname.slice(1)),
    ssl: /^(localhost|127\.0\.0\.1|::1)$/i.test(connectionUrl.hostname) ? false : {
      rejectUnauthorized: true,
      ...(existsSync(caFile) ? { ca: readFileSync(caFile, 'utf8') } : {}),
    },
    connectionTimeoutMillis: 8000,
  })
  try {
    await client.connect()
    const result = await client.query(`
      select current_database() as database_name,
        to_regclass('public.favorites') is not null as favorites_exists,
        to_regclass('public.reviews') is not null as reviews_exists,
        to_regclass('app_private.site_admins') is not null as site_admins_exists,
        to_regclass('supabase_migrations.schema_migrations') is not null as migration_history_exists,
        exists (select 1 from pg_extension where extname = 'supabase_vault') as vault_enabled,
        (select count(*) from auth.users) as auth_user_count
    `)
    console.log(JSON.stringify({ connected: true, ...result.rows[0] }))
  } catch (error) {
    const message = String(error?.message ?? '')
    const category = /certificate|ssl|tls/i.test(message) ? 'TLS'
      : /password|authentication|SASL/i.test(message) ? 'AUTH'
      : /getaddrinfo|ENOTFOUND|EAI_AGAIN/i.test(message) ? 'DNS'
      : /timeout|ETIMEDOUT/i.test(message) ? 'TIMEOUT'
      : /ECONNREFUSED/i.test(message) ? 'REFUSED'
      : 'OTHER'
    const tlsReason = category === 'TLS' ? (/self.signed/i.test(message) ? 'SELF_SIGNED'
      : /unable to verify|certificate chain/i.test(message) ? 'CERT_CHAIN'
      : /does not support ssl/i.test(message) ? 'SSL_UNSUPPORTED'
      : /hostname|altname/i.test(message) ? 'HOSTNAME_MISMATCH'
      : 'OTHER') : undefined
    console.error(JSON.stringify({ connected: false, code: error?.code ?? 'CONNECTION_ERROR', category, tlsReason }))
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}

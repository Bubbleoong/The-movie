import { readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { ApiError } from '../errors/ApiError.js'

let pool: pg.Pool | null = null

function databaseCaCertificate(): string {
  const fromEnv = process.env.DATABASE_CA_CERT
  if (fromEnv) return fromEnv.replace(/\\n/g, '\n')
  return readFileSync(path.resolve(process.cwd(), 'supabase/ca.crt'), 'utf8')
}

export function databasePool() {
  if (pool) return pool
  const connection = process.env.DATABASE_URL
  if (!connection) throw new ApiError(503, 'DB_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลบน server')
  const url = new URL(connection)
  pool = new pg.Pool({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: true, ca: databaseCaCertificate() },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  })
  return pool
}

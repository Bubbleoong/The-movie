import { ApiError } from '../middleware/apiError.js'
import { databasePool } from './database.js'

let cachedKey: string | null = null
let cacheUntil = 0

export async function getTmdbApiKey(): Promise<string> {
  if (cachedKey && Date.now() < cacheUntil) return cachedKey
  try {
    const result = await databasePool().query<{ decrypted_secret: string }>(
      'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1',
      ['tmdb_api_key'],
    )
    const key = result.rows[0]?.decrypted_secret
    if (!key) throw new ApiError(503, 'TMDB_NOT_CONFIGURED', 'ไม่พบ TMDB API key ใน Supabase Vault')
    cachedKey = key
    cacheUntil = Date.now() + 5 * 60_000
    return key
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(503, 'TMDB_NOT_CONFIGURED', 'อ่าน TMDB API key จาก Supabase Vault ไม่ได้')
  }
}

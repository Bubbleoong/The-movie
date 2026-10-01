import { ApiError } from '../errors/ApiError.js'
import { findTmdbApiKey } from '../repositories/secrets.js'

let cachedKey: string | null = null
let cacheUntil = 0

export async function getTmdbApiKey(): Promise<string> {
  if (cachedKey && Date.now() < cacheUntil) return cachedKey
  try {
    const key = await findTmdbApiKey()
    if (!key) throw new ApiError(503, 'TMDB_NOT_CONFIGURED', 'ไม่พบ TMDB API key ใน Supabase Vault')
    cachedKey = key
    cacheUntil = Date.now() + 5 * 60_000
    return key
  } catch (error) {
    if (error instanceof ApiError) throw error
    console.error('Reading TMDB API key from Supabase Vault failed:', error)
    throw new ApiError(503, 'TMDB_NOT_CONFIGURED', 'อ่าน TMDB API key จาก Supabase Vault ไม่ได้')
  }
}

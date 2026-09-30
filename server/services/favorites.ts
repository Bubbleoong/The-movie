import type { Favorite, MediaId } from '../../src/types/media.js'
import { ApiError } from '../middleware/apiError.js'

type Row = { media_type: 'movie' | 'tv'; tmdb_id: number; created_at: string }

function config() {
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!base || !key) throw new ApiError(503, 'DB_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า Supabase')
  return { base: base.replace(/\/$/, ''), key }
}

async function request<T>(accessToken: string, method: string, query: string, body?: unknown): Promise<T> {
  const { base, key } = config()
  let response: Response
  try {
    response = await fetch(`${base}/rest/v1/favorites?${query}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(method === 'POST' ? { Prefer: 'resolution=ignore-duplicates,return=minimal' } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ApiError(502, 'DB_UNAVAILABLE', 'ติดต่อฐานข้อมูล Favorite ไม่ได้')
  }
  if (!response.ok) {
    if (response.status === 401) throw new ApiError(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบอีกครั้ง')
    console.warn('Supabase favorites request failed', { method, status: response.status })
    throw new ApiError(502, 'DB_UNAVAILABLE', 'จัดการ Favorite ไม่สำเร็จ')
  }
  if (response.status === 204 || method !== 'GET') return undefined as T
  return response.json() as Promise<T>
}

function toFavorite(row: Row): Favorite {
  return { mediaType: row.media_type, tmdbId: row.tmdb_id, createdAt: row.created_at }
}

function identityQuery(userId: string, mediaId?: MediaId) {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
  })
  if (mediaId) {
    params.set('media_type', `eq.${mediaId.mediaType}`)
    params.set('tmdb_id', `eq.${mediaId.tmdbId}`)
  }
  return params.toString()
}

export async function listFavorites(accessToken: string, userId: string): Promise<Favorite[]> {
  const rows = await request<Row[]>(accessToken, 'GET', `select=media_type,tmdb_id,created_at&${identityQuery(userId)}&order=created_at.desc`)
  return rows.map(toFavorite)
}

export async function addFavorite(accessToken: string, userId: string, mediaId: MediaId): Promise<Favorite> {
  await request<void>(accessToken, 'POST', 'on_conflict=user_id,media_type,tmdb_id', {
    user_id: userId,
    media_type: mediaId.mediaType,
    tmdb_id: mediaId.tmdbId,
  })
  const rows = await request<Row[]>(accessToken, 'GET', `select=media_type,tmdb_id,created_at&${identityQuery(userId, mediaId)}`)
  if (!rows[0]) throw new ApiError(502, 'DB_UNAVAILABLE', 'บันทึก Favorite ไม่สำเร็จ')
  return toFavorite(rows[0])
}

export async function removeFavorite(accessToken: string, userId: string, mediaId: MediaId): Promise<void> {
  await request<void>(accessToken, 'DELETE', identityQuery(userId, mediaId))
}

import { ApiError } from '../errors/ApiError.js'
import { getTmdbApiKey } from './tmdbKey.js'

const baseUrl = 'https://api.themoviedb.org/3/'

export async function tmdbGet<T>(endpoint: string, query: Record<string, string> = {}): Promise<T> {
  const apiKey = await getTmdbApiKey()

  const url = new URL(endpoint, baseUrl)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'th-TH')
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value)

  let response: Response
  try {
    response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'เชื่อมต่อ TMDB ไม่สำเร็จ')
  }

  if (response.status === 404) throw new ApiError(404, 'NOT_FOUND', 'ไม่พบข้อมูลเรื่องนี้ใน TMDB')
  if (!response.ok) throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'TMDB ไม่พร้อมให้บริการในขณะนี้')

  try {
    return await response.json() as T
  } catch {
    throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'TMDB ส่งข้อมูลที่อ่านไม่ได้')
  }
}

import type { MediaType, PersonCredit, TitleDetail, TitlePageResponse, TitleSummary, Trailer } from '../../src/types/media.js'
import { ApiError } from '../errors/ApiError.js'
import { tmdbGet } from './tmdb.js'

type TmdbTitle = {
  id: number
  media_type?: string
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  popularity?: number
  adult?: boolean
}

type TmdbPage = { page: number; total_pages: number; results: TmdbTitle[] }
type TmdbCredit = { id: number; name: string; character?: string; job?: string; profile_path?: string | null }
type TmdbVideo = { site: string; key: string; name: string; type: string; official?: boolean; iso_639_1?: string }
type TmdbDetail = TmdbTitle & {
  runtime?: number | null
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  genres?: { id: number; name: string }[]
  credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] }
  videos?: { results?: TmdbVideo[] }
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function pathOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null
}

function summary(item: TmdbTitle, mediaType: MediaType): TitleSummary {
  return {
    mediaType,
    tmdbId: item.id,
    title: textOrNull(mediaType === 'movie' ? item.title : item.name) ?? 'ไม่ระบุชื่อ',
    date: textOrNull(mediaType === 'movie' ? item.release_date : item.first_air_date),
    posterPath: pathOrNull(item.poster_path),
    backdropPath: pathOrNull(item.backdrop_path),
    tmdbScore: typeof item.vote_average === 'number' && Number.isFinite(item.vote_average) ? item.vote_average : null,
    overview: textOrNull(item.overview),
  }
}

function pageResult(items: TitleSummary[], page: number, totalPages: number): TitlePageResponse {
  if (!Number.isInteger(totalPages) || totalPages < 0) {
    throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'TMDB ส่งจำนวนหน้าที่ไม่ถูกต้อง')
  }
  const availablePages = Math.min(totalPages, 500)
  return { data: items, page, totalPages: availablePages, hasMore: page < availablePages }
}

function validResults(result: TmdbPage): TmdbTitle[] {
  if (!Array.isArray(result.results)) throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'TMDB ส่งรายการที่ไม่ถูกต้อง')
  return result.results.filter(item => Number.isSafeInteger(item.id) && item.id > 0 && item.adult !== true)
}

export async function popularTitles(mediaType: MediaType, page: number): Promise<TitlePageResponse> {
  const result = await tmdbGet<TmdbPage>(`${mediaType}/popular`, { page: String(page) })
  return pageResult(validResults(result).map(item => summary(item, mediaType)), page, result.total_pages)
}

export async function animationTitles(page: number): Promise<TitlePageResponse> {
  const query = { page: String(page), with_genres: '16', sort_by: 'popularity.desc', include_adult: 'false' }
  const [movies, series] = await Promise.all([
    tmdbGet<TmdbPage>('discover/movie', query),
    tmdbGet<TmdbPage>('discover/tv', query),
  ])

  const combined = [
    ...validResults(movies).map(item => ({ item, mediaType: 'movie' as const })),
    ...validResults(series).map(item => ({ item, mediaType: 'tv' as const })),
  ].sort((a, b) => (b.item.popularity ?? 0) - (a.item.popularity ?? 0))

  return pageResult(combined.map(({ item, mediaType }) => summary(item, mediaType)), page, Math.max(movies.total_pages, series.total_pages))
}

export async function searchTitles(query: string, page: number): Promise<TitlePageResponse> {
  const result = await tmdbGet<TmdbPage>('search/multi', { query, page: String(page), include_adult: 'false' })
  const titles = validResults(result)
    .filter((item): item is TmdbTitle & { media_type: MediaType } => item.media_type === 'movie' || item.media_type === 'tv')
    .map(item => summary(item, item.media_type))
  return pageResult(titles, page, result.total_pages)
}

function credit(item: TmdbCredit, role: string | undefined): PersonCredit {
  return { tmdbId: item.id, name: item.name, role: textOrNull(role), profilePath: pathOrNull(item.profile_path) }
}

function trailer(videos: TmdbVideo[]): Trailer {
  const candidates = videos.filter(video => video.type === 'Trailer' && (
    (video.site === 'YouTube' && /^[A-Za-z0-9_-]+$/.test(video.key)) ||
    (video.site === 'Vimeo' && /^\d+$/.test(video.key))
  ))
  const selected = candidates.sort((a, b) => Number(b.official === true) - Number(a.official === true) ||
    Number(b.iso_639_1 === 'th') - Number(a.iso_639_1 === 'th'))[0]
  if (!selected) return null
  const site = selected.site as 'YouTube' | 'Vimeo'
  return {
    site,
    key: selected.key,
    name: selected.name,
    url: site === 'YouTube' ? `https://www.youtube.com/watch?v=${selected.key}` : `https://vimeo.com/${selected.key}`,
  }
}

export async function titleDetail(mediaType: MediaType, tmdbId: number): Promise<TitleDetail> {
  const item = await tmdbGet<TmdbDetail>(`${mediaType}/${tmdbId}`, {
    append_to_response: 'credits,videos',
    include_video_language: 'th-TH,en-US,null',
  })
  if (item.id !== tmdbId) throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'TMDB ส่งรายละเอียดที่ไม่ตรงกับเรื่องที่ขอ')

  const runtime = mediaType === 'movie' ? item.runtime : item.episode_run_time?.[0]
  return {
    ...summary(item, mediaType),
    genres: Array.isArray(item.genres) ? item.genres : [],
    runtimeMinutes: typeof runtime === 'number' && runtime > 0 ? runtime : null,
    runtimeLabel: mediaType === 'movie' ? 'movie' : 'per_episode',
    cast: (item.credits?.cast ?? []).map(person => credit(person, person.character)),
    crew: (item.credits?.crew ?? []).map(person => credit(person, person.job)),
    trailer: trailer(item.videos?.results ?? []),
    seasonsCount: mediaType === 'tv' && Number.isInteger(item.number_of_seasons) ? item.number_of_seasons! : null,
    episodesCount: mediaType === 'tv' && Number.isInteger(item.number_of_episodes) ? item.number_of_episodes! : null,
  }
}

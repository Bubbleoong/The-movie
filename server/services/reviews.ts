import type pg from 'pg'
import type { MediaId, Review, ReviewSummary } from '../../src/types/media.js'
import { ApiError } from '../middleware/apiError.js'
import { databasePool } from './database.js'

type Row = {
  id: string
  user_id: string
  media_type: 'movie' | 'tv'
  tmdb_id: number
  rating: number
  body: string
  created_at: Date | string
  updated_at: Date | string
}

function mapReview(row: Row, userId: string | null, admin: boolean): Review {
  const isMine = row.user_id === userId
  return {
    id: row.id,
    authorId: row.user_id,
    mediaType: row.media_type,
    tmdbId: Number(row.tmdb_id),
    rating: row.rating,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    isMine,
    canDelete: isMine || admin,
  }
}

async function asRole<T>(userId: string | null, action: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  let client: pg.PoolClient
  try {
    client = await databasePool().connect()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(503, 'DB_UNAVAILABLE', 'ติดต่อฐานข้อมูลรีวิวไม่ได้')
  }
  try {
    await client.query('begin')
    await client.query(userId ? 'set local role authenticated' : 'set local role anon')
    if (userId) await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId])
    const result = await action(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    if (error instanceof ApiError) throw error
    console.warn('Reviews database operation failed', { code: (error as { code?: string }).code ?? 'unknown' })
    throw new ApiError(503, 'DB_UNAVAILABLE', 'จัดการรีวิวไม่สำเร็จ')
  } finally {
    client.release()
  }
}

export async function listReviews(id: MediaId, page: number, userId: string | null) {
  return asRole(userId, async client => {
    const summaryResult = await client.query<{ count: number; average: string | null }>(
      'select count(*)::integer as count, round(avg(rating)::numeric, 1) as average from public.reviews where media_type=$1 and tmdb_id=$2',
      [id.mediaType, id.tmdbId],
    )
    const summary: ReviewSummary = {
      count: summaryResult.rows[0].count,
      average: summaryResult.rows[0].average === null ? null : Number(summaryResult.rows[0].average),
    }
    const admin = userId ? (await client.query<{ allowed: boolean }>('select app_private.is_site_admin() as allowed')).rows[0].allowed : false
    const rows = await client.query<Row>(
      'select id,user_id,media_type,tmdb_id,rating,body,created_at,updated_at from public.reviews where media_type=$1 and tmdb_id=$2 order by created_at desc,id desc limit 10 offset $3',
      [id.mediaType, id.tmdbId, (page - 1) * 10],
    )
    return { data: rows.rows.map(row => mapReview(row, userId, admin)), summary, page, totalPages: Math.ceil(summary.count / 10) }
  })
}

export async function saveReview(id: MediaId, userId: string, rating: number, body: string) {
  return asRole(userId, async client => {
    const result = await client.query<Row>(
      `insert into public.reviews(user_id,media_type,tmdb_id,rating,body)
       values($1,$2,$3,$4,$5)
       on conflict(user_id,media_type,tmdb_id) do update set rating=excluded.rating,body=excluded.body
       returning id,user_id,media_type,tmdb_id,rating,body,created_at,updated_at`,
      [userId, id.mediaType, id.tmdbId, rating, body],
    )
    return mapReview(result.rows[0], userId, false)
  })
}

export async function getMyReview(id: MediaId, userId: string): Promise<Review | null> {
  return asRole(userId, async client => {
    const rows = await client.query<Row>(
      'select id,user_id,media_type,tmdb_id,rating,body,created_at,updated_at from public.reviews where user_id=$1 and media_type=$2 and tmdb_id=$3',
      [userId, id.mediaType, id.tmdbId],
    )
    return rows.rows[0] ? mapReview(rows.rows[0], userId, false) : null
  })
}

export async function deleteMyReview(id: MediaId, userId: string) {
  return asRole(userId, async client => {
    await client.query('delete from public.reviews where user_id=$1 and media_type=$2 and tmdb_id=$3',
      [userId, id.mediaType, id.tmdbId])
  })
}

export async function deleteReview(id: MediaId, reviewId: string, userId: string) {
  return asRole(userId, async client => {
    const result = await client.query('delete from public.reviews where id=$1 and media_type=$2 and tmdb_id=$3',
      [reviewId, id.mediaType, id.tmdbId])
    if (result.rowCount === 0) throw new ApiError(404, 'NOT_FOUND', 'ไม่พบรีวิวที่ลบได้')
  })
}

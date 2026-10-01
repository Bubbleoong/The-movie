import type { MediaId, Review, ReviewSummary } from '../../src/types/media.js'
import { ApiError } from '../errors/ApiError.js'
import { asRole, selectReviewSummary, selectReviewAdmin, selectReviews, upsertReview, selectMyReview, removeMyReview, removeReview } from '../repositories/reviews.js'
import type { Row } from '../repositories/reviews.js'

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

export async function listReviews(id: MediaId, page: number, userId: string | null) {
  return asRole(userId, async client => {
    const summaryResult = await selectReviewSummary(client, id)
    const summary: ReviewSummary = {
      count: summaryResult.rows[0].count,
      average: summaryResult.rows[0].average === null ? null : Number(summaryResult.rows[0].average),
    }
    const admin = userId ? (await selectReviewAdmin(client)).rows[0].allowed : false
    const rows = await selectReviews(client, id, page)
    return { data: rows.rows.map(row => mapReview(row, userId, admin)), summary, page, totalPages: Math.ceil(summary.count / 10) }
  })
}

export async function saveReview(id: MediaId, userId: string, rating: number, body: string) {
  return asRole(userId, async client => {
    const result = await upsertReview(client, userId, id, rating, body)
    return mapReview(result.rows[0], userId, false)
  })
}

export async function getMyReview(id: MediaId, userId: string): Promise<Review | null> {
  return asRole(userId, async client => {
    const rows = await selectMyReview(client, userId, id)
    return rows.rows[0] ? mapReview(rows.rows[0], userId, false) : null
  })
}

export async function deleteMyReview(id: MediaId, userId: string) {
  return asRole(userId, async client => {
    await removeMyReview(client, userId, id)
  })
}

export async function deleteReview(id: MediaId, reviewId: string, userId: string) {
  return asRole(userId, async client => {
    const result = await removeReview(client, reviewId, id)
    if (result.rowCount === 0) throw new ApiError(404, 'NOT_FOUND', 'ไม่พบรีวิวที่ลบได้')
  })
}

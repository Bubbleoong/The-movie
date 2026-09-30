import { apiClient } from './client'
import type { MediaId, Review, ReviewSummary } from '../types/media'

export type ReviewPage = { data: Review[]; summary: ReviewSummary; page: number; totalPages: number }

function path(id: MediaId) { return `/titles/${id.mediaType}/${id.tmdbId}` }

export async function getReviews(id: MediaId, page = 1): Promise<ReviewPage> {
  const response = await apiClient.get<ReviewPage>(`${path(id)}/reviews`, { params: { page } })
  return response.data
}

export async function getMyReview(id: MediaId): Promise<Review | null> {
  const response = await apiClient.get<{ data: Review | null }>(`${path(id)}/my-review`)
  return response.data.data
}

export async function saveReview(id: MediaId, rating: number, body: string): Promise<Review> {
  const response = await apiClient.put<{ data: Review }>(`${path(id)}/my-review`, { rating, body })
  return response.data.data
}

export async function deleteMyReview(id: MediaId): Promise<void> {
  await apiClient.delete(`${path(id)}/my-review`)
}

export async function deleteReview(id: MediaId, reviewId: string): Promise<void> {
  await apiClient.delete(`${path(id)}/reviews/${reviewId}`)
}

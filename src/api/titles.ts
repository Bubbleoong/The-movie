import { apiClient } from './client'
import type { MediaType, TitleDetail, TitlePageResponse } from '../types/media'

export async function getPopularTitles(mediaType: MediaType, page = 1): Promise<TitlePageResponse> {
  const response = await apiClient.get<TitlePageResponse>('/titles/popular', { params: { mediaType, page } })
  return response.data
}

export async function getAnimationTitles(page = 1): Promise<TitlePageResponse> {
  const response = await apiClient.get<TitlePageResponse>('/titles/animation', { params: { page } })
  return response.data
}

export async function searchTitles(query: string, page = 1): Promise<TitlePageResponse> {
  const response = await apiClient.get<TitlePageResponse>('/titles/search', { params: { q: query, page } })
  return response.data
}

export async function getTitleDetail(mediaType: MediaType, tmdbId: number): Promise<TitleDetail> {
  const response = await apiClient.get<{ data: TitleDetail }>(`/titles/${mediaType}/${tmdbId}`)
  return response.data.data
}

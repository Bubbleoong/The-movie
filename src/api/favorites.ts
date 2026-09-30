import { apiClient } from './client'
import type { Favorite, MediaId } from '../types/media'

export async function getFavorites(): Promise<Favorite[]> {
  const response = await apiClient.get<{ data: Favorite[] }>('/favorites')
  return response.data.data
}

export async function addFavorite(id: MediaId): Promise<Favorite> {
  const response = await apiClient.put<{ data: Favorite }>(`/favorites/${id.mediaType}/${id.tmdbId}`)
  return response.data.data
}

export async function removeFavorite(id: MediaId): Promise<void> {
  await apiClient.delete(`/favorites/${id.mediaType}/${id.tmdbId}`)
}

import type { Favorite, MediaId } from '../../src/types/media.js'
import * as repository from '../repositories/favorites.js'

function toFavorite(row: repository.Row): Favorite {
  return { mediaType: row.media_type, tmdbId: row.tmdb_id, createdAt: row.created_at }
}

export async function listFavorites(accessToken: string, userId: string): Promise<Favorite[]> {
  return (await repository.listFavorites(accessToken, userId)).map(toFavorite)
}

export async function addFavorite(accessToken: string, userId: string, id: MediaId): Promise<Favorite> {
  return toFavorite(await repository.addFavorite(accessToken, userId, id))
}

export async function removeFavorite(accessToken: string, userId: string, id: MediaId): Promise<void> {
  await repository.removeFavorite(accessToken, userId, id)
}

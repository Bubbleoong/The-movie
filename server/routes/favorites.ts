import { Router } from 'express'
import type { MediaId } from '../../src/types/media.js'
import { ApiError } from '../middleware/apiError.js'
import { authenticatedUser, requireSameOrigin } from '../middleware/session.js'
import { addFavorite, listFavorites, removeFavorite } from '../services/favorites.js'

export const favoritesRouter = Router()

function mediaId(mediaType: unknown, tmdbId: unknown): MediaId {
  if (mediaType !== 'movie' && mediaType !== 'tv') throw new ApiError(400, 'INVALID_INPUT', 'mediaType ต้องเป็น movie หรือ tv')
  if (typeof tmdbId !== 'string' || !/^[1-9]\d*$/.test(tmdbId) || !Number.isSafeInteger(Number(tmdbId))) {
    throw new ApiError(400, 'INVALID_INPUT', 'tmdbId ต้องเป็นจำนวนเต็มบวก')
  }
  return { mediaType, tmdbId: Number(tmdbId) }
}

favoritesRouter.get('/', async (request, response, next) => {
  try {
    const { user, accessToken } = await authenticatedUser(request, response)
    response.json({ data: await listFavorites(accessToken, user.id) })
  } catch (error) { next(error) }
})

favoritesRouter.put('/:mediaType/:tmdbId', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const id = mediaId(request.params.mediaType, request.params.tmdbId)
    const { user, accessToken } = await authenticatedUser(request, response)
    response.json({ data: await addFavorite(accessToken, user.id, id) })
  } catch (error) { next(error) }
})

favoritesRouter.delete('/:mediaType/:tmdbId', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const id = mediaId(request.params.mediaType, request.params.tmdbId)
    const { user, accessToken } = await authenticatedUser(request, response)
    await removeFavorite(accessToken, user.id, id)
    response.json({ data: null })
  } catch (error) { next(error) }
})

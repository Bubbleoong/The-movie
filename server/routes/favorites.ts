import { Router } from 'express'
import { getFavoritesController, putFavoriteController, deleteFavoriteController } from '../controllers/favorites.js'

export const favoritesRouter = Router()

favoritesRouter.get('/', getFavoritesController)
favoritesRouter.put('/:mediaType/:tmdbId', putFavoriteController)
favoritesRouter.delete('/:mediaType/:tmdbId', deleteFavoriteController)

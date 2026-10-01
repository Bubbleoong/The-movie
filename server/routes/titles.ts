import { Router } from 'express'
import { getPopularController, getAnimationController, searchTitlesController, getTitleDetailController } from '../controllers/titles.js'

export const titlesRouter = Router()

titlesRouter.get('/popular', getPopularController)
titlesRouter.get('/animation', getAnimationController)
titlesRouter.get('/search', searchTitlesController)
titlesRouter.get('/:mediaType/:tmdbId', getTitleDetailController)

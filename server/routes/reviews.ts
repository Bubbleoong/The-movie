import { Router } from 'express'
import { getReviewsController, putMyReviewController, getMyReviewController, deleteMyReviewController, deleteReviewController } from '../controllers/reviews.js'

export const reviewsRouter = Router()

reviewsRouter.get('/:mediaType/:tmdbId/reviews', getReviewsController)
reviewsRouter.put('/:mediaType/:tmdbId/my-review', putMyReviewController)
reviewsRouter.get('/:mediaType/:tmdbId/my-review', getMyReviewController)
reviewsRouter.delete('/:mediaType/:tmdbId/my-review', deleteMyReviewController)
reviewsRouter.delete('/:mediaType/:tmdbId/reviews/:reviewId', deleteReviewController)

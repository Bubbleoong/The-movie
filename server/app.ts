import 'dotenv/config'
import express from 'express'
import { apiErrorHandler } from './middleware/errorMiddleware.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { titlesRouter } from './routes/titles.js'
import { favoritesRouter } from './routes/favorites.js'
import { reviewsRouter } from './routes/reviews.js'

export function createApp(): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))

  app.use('/api', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/titles', reviewsRouter)
  app.use('/api/titles', titlesRouter)
  app.use('/api/favorites', favoritesRouter)
  app.use('/api', (_request, response) => {
    response.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API นี้ยังไม่ได้พัฒนา' } })
  })

  app.use(apiErrorHandler)
  return app
}

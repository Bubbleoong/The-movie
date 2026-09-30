import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { apiErrorHandler } from './middleware/apiError.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { titlesRouter } from './routes/titles.js'
import { favoritesRouter } from './routes/favorites.js'
import { reviewsRouter } from './routes/reviews.js'

const app = express()
app.use(express.json({ limit: '16kb' }))
const port = Number(process.env.SERVER_PORT ?? 3001)
const publicDirectory = path.resolve(process.cwd(), 'dist')

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/titles', reviewsRouter)
app.use('/api/titles', titlesRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api', (_request, response) => {
  response.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API นี้ยังไม่ได้พัฒนา' } })
})
app.use(apiErrorHandler)

app.use(express.static(publicDirectory))
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(publicDirectory, 'index.html'))
})

app.listen(port, () => {
  console.log(`The Movie Web server listening on http://localhost:${port}`)
})

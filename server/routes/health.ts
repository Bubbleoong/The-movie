import { Router } from 'express'
import { getHealthController } from '../controllers/health.js'

export const healthRouter = Router()

healthRouter.get('/health', getHealthController)

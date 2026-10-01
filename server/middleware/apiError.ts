import type { ErrorRequestHandler } from 'express'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const apiErrorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ApiError) {
    if (error.status >= 500) console.error(`API error ${error.status} ${error.code}:`, error.message)
    response.status(error.status).json({ error: { code: error.code, message: error.message } })
    return
  }

  console.error('API request failed:', error)
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'ระบบไม่สามารถดำเนินการได้' } })
}

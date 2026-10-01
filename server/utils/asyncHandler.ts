import type { RequestHandler } from 'express'

// Forward controller failures to the shared error middleware.
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve().then(() => handler(request, response, next)).catch(next)
  }
}

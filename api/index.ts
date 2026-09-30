import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app.js'

const app = createApp()

// Vercel expects a default export of a Node.js HTTP handler function
export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req, res)
}

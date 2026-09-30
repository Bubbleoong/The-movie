import type { Request, Response } from 'express'
import { ApiError } from './apiError.js'
import { getUser, refreshSession } from '../services/supabaseAuth.js'
import type { Session } from '../services/supabaseAuth.js'

const accessName = 'movie_access'
const refreshName = 'movie_refresh'

export function readCookie(request: Request, name: string) {
  const pair = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null
}

export function accessCookie(request: Request) { return readCookie(request, accessName) }
export function refreshCookie(request: Request) { return readCookie(request, refreshName) }

export function setSession(response: Response, session: Session) {
  const secure = process.env.NODE_ENV === 'production'
  const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/api' }
  response.cookie(accessName, session.access_token, { ...base, maxAge: Math.max(60, session.expires_in) * 1000 })
  response.cookie(refreshName, session.refresh_token, { ...base, maxAge: 30 * 24 * 60 * 60 * 1000 })
}

export function clearSession(response: Response) {
  const base = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api' }
  response.clearCookie(accessName, base)
  response.clearCookie(refreshName, base)
}

export function requireSameOrigin(request: Request) {
  const origin = request.get('origin')
  const allowed = new Set([`http://${request.get('host')}`, `https://${request.get('host')}`])
  if (process.env.NODE_ENV !== 'production') allowed.add('http://localhost:5173')
  if (process.env.APP_ORIGIN) allowed.add(process.env.APP_ORIGIN)
  if (!origin || !allowed.has(origin)) throw new ApiError(403, 'BAD_ORIGIN', 'คำขอนี้ไม่ได้มาจากเว็บไซต์ที่อนุญาต')
}

export async function authenticatedUser(request: Request, response: Response) {
  const access = accessCookie(request)
  if (access) {
    try {
      const user = await getUser(access)
      return { user, accessToken: access }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    }
  }
  const refresh = refreshCookie(request)
  if (refresh) {
    try {
      const session = await refreshSession(refresh)
      const user = await getUser(session.access_token)
      setSession(response, session)
      return { user, accessToken: session.access_token }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    }
  }
  clearSession(response)
  throw new ApiError(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ')
}

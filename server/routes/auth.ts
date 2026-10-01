import { Router } from 'express'
import { ApiError } from '../middleware/apiError.js'
import { accessCookie, clearSession, refreshCookie, requireSameOrigin, setSession } from '../middleware/session.js'
import { getUser, refreshSession, sendPasswordRecovery, signIn, signOut, signUp, updatePassword, verifyPasswordRecovery } from '../services/supabaseAuth.js'
import type { Session } from '../services/supabaseAuth.js'

export const authRouter = Router()

function credentials(body: unknown) {
  if (!body || typeof body !== 'object') throw new ApiError(400, 'INVALID_INPUT', 'กรุณากรอกอีเมลและรหัสผ่าน')
  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    throw new ApiError(400, 'INVALID_INPUT', 'กรุณากรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร')
  }
  return { email: email.trim(), password }
}

authRouter.post('/signup', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const { email, password } = credentials(request.body)
    const result = await signUp(email, password)
    if (result.access_token && result.refresh_token && result.user) setSession(response, result as Session)
    response.status(201).json({ data: { id: result.user?.id ?? null, email: result.user?.email ?? email, requiresEmailConfirmation: !result.access_token } })
  } catch (error) { next(error) }
})

authRouter.post('/login', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const { email, password } = credentials(request.body)
    const session = await signIn(email, password)
    setSession(response, session)
    response.json({ data: { id: session.user.id, email: session.user.email } })
  } catch (error) { next(error) }
})

authRouter.post('/logout', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const access = accessCookie(request)
    if (access) await signOut(access).catch(() => {})
    clearSession(response)
    response.json({ data: null })
  } catch (error) { next(error) }
})

authRouter.post('/recover', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const email = request.body?.email
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim()) || email.length > 254) {
      throw new ApiError(400, 'INVALID_INPUT', 'กรุณากรอกอีเมลให้ถูกต้อง')
    }
    const origin = request.get('origin') ?? process.env.APP_ORIGIN
    if (!origin || !/^https?:\/\/[^/]+$/.test(origin)) throw new ApiError(500, 'APP_ORIGIN_MISSING', 'ยังไม่ได้กำหนด URL ของเว็บสำหรับลิงก์กู้คืนรหัสผ่าน')
    await sendPasswordRecovery(email.trim(), `${origin}/reset-password`)
    response.json({ data: { message: 'หากมีบัญชีสำหรับอีเมลนี้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้' } })
  } catch (error) { next(error) }
})

authRouter.post('/reset-password', async (request, response, next) => {
  try {
    requireSameOrigin(request)
    const { tokenHash, accessToken, password } = request.body ?? {}
    const validHash = typeof tokenHash === 'string' && /^[a-zA-Z0-9_-]{16,512}$/.test(tokenHash)
    const validAccess = typeof accessToken === 'string' && accessToken.length <= 8192 &&
      /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(accessToken)
    if (validHash === validAccess || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      throw new ApiError(400, 'INVALID_INPUT', 'ลิงก์หรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านต้องมี 6–128 ตัวอักษร)')
    }
    let session: Session
    try {
      if (validHash) session = await verifyPasswordRecovery(tokenHash)
      else {
        const user = await getUser(accessToken)
        session = { access_token: accessToken, refresh_token: '', expires_in: 0, user }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(400, 'RESET_LINK_INVALID', 'ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่')
      }
      throw error
    }
    await updatePassword(session.access_token, password)
    await signOut(session.access_token).catch(() => {})
    clearSession(response)
    response.json({ data: { message: 'ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ' } })
  } catch (error) { next(error) }
})

authRouter.get('/me', async (request, response, next) => {
  try {
    const access = accessCookie(request)
    const refresh = refreshCookie(request)
    if (!access && !refresh) { response.json({ data: null }); return }
    if (access) {
      try {
        const user = await getUser(access)
        response.json({ data: { id: user.id, email: user.email } })
        return
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
      }
    }
    if (!refresh) { clearSession(response); response.json({ data: null }); return }
    try {
      const session = await refreshSession(refresh)
      const user = await getUser(session.access_token)
      setSession(response, session)
      response.json({ data: { id: user.id, email: user.email } })
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
      clearSession(response)
      response.json({ data: null })
    }
  } catch (error) { next(error) }
})

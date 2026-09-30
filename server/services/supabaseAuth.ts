import { ApiError } from '../middleware/apiError.js'

type AuthUser = { id: string; email?: string | null }
export type Session = { access_token: string; refresh_token: string; expires_in: number; user: AuthUser }

function config() {
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!base || !key) throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า Supabase Auth')
  return { base: base.replace(/\/$/, ''), key }
}

async function authFetch<T>(path: string, method: string, body?: unknown, accessToken?: string): Promise<T> {
  const { base, key } = config()
  let response: Response
  try {
    response = await fetch(`${base}/auth/v1${path}`, {
      method,
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ApiError(502, 'AUTH_UNAVAILABLE', 'ติดต่อระบบสมาชิกไม่ได้')
  }
  if (!response.ok) {
    if (path === '/recover') {
      const payload: unknown = await response.json().catch(() => null)
      const code = payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string'
        ? payload.code : 'unknown'
      console.warn('Supabase password recovery failed', { status: response.status, code })
      if (response.status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
        throw new ApiError(429, 'RECOVERY_RATE_LIMIT', 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่')
      }
      if (code === 'email_address_not_authorized') {
        throw new ApiError(502, 'RECOVERY_EMAIL_RESTRICTED', 'Supabase ยังไม่อนุญาตให้ส่งอีเมลถึงที่อยู่นี้ กรุณาตั้งค่า Custom SMTP หรือใช้บัญชีในทีม Supabase')
      }
      if (response.status >= 500) {
        throw new ApiError(502, 'RECOVERY_DELIVERY_FAILED', 'Supabase ส่งอีเมลกู้คืนไม่สำเร็จ กรุณาตรวจ Auth Logs, เทมเพลต Reset Password และ SMTP')
      }
      throw new ApiError(502, 'RECOVERY_FAILED', 'ส่งอีเมลกู้คืนไม่สำเร็จ กรุณาตรวจการตั้งค่า Supabase Auth')
    }
    if (response.status === 400 || response.status === 401 || response.status === 422) {
      throw new ApiError(401, 'AUTH_INVALID', 'ข้อมูลเข้าสู่ระบบไม่ถูกต้องหรือบัญชียังไม่ยืนยันอีเมล')
    }
    throw new ApiError(502, 'AUTH_UNAVAILABLE', 'ระบบสมาชิกไม่พร้อมให้บริการ')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function signUp(email: string, password: string) {
  return authFetch<AuthUser & Partial<Session>>('/signup', 'POST', { email, password })
}

export async function signIn(email: string, password: string) {
  return authFetch<Session>('/token?grant_type=password', 'POST', { email, password })
}

export async function refreshSession(refreshToken: string) {
  return authFetch<Session>('/token?grant_type=refresh_token', 'POST', { refresh_token: refreshToken })
}

export async function getUser(accessToken: string) {
  return authFetch<AuthUser>('/user', 'GET', undefined, accessToken)
}

export async function signOut(accessToken: string) {
  await authFetch<unknown>('/logout', 'POST', undefined, accessToken)
}

export async function sendPasswordRecovery(email: string) {
  await authFetch<unknown>('/recover', 'POST', { email })
}

export async function verifyPasswordRecovery(tokenHash: string) {
  return authFetch<Session>('/verify', 'POST', { token_hash: tokenHash, type: 'recovery' })
}

export async function updatePassword(accessToken: string, password: string) {
  await authFetch<AuthUser>('/user', 'PUT', { password }, accessToken)
}

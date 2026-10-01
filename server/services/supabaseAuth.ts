import { ApiError } from '../errors/ApiError.js'
import { accountExists } from '../repositories/auth.js'
import { authFetch } from '../repositories/supabaseAuth.js'

type AuthUser = { id: string; email?: string | null }
export type Session = { access_token: string; refresh_token: string; expires_in: number; user: AuthUser }

export async function signUp(email: string, password: string) {
  // Supabase can conceal duplicate signups in a successful response. Check on
  // the server so the signup form can give an explicit account-exists message.
  if (await accountExists(email)) {
    throw new ApiError(409, 'ACCOUNT_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือใช้ลืมรหัสผ่าน')
  }
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

export async function sendPasswordRecovery(email: string, redirectTo: string) {
  await authFetch<unknown>(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, 'POST', { email })
}

export async function verifyPasswordRecovery(tokenHash: string) {
  return authFetch<Session>('/verify', 'POST', { token_hash: tokenHash, type: 'recovery' })
}

export async function updatePassword(accessToken: string, password: string) {
  await authFetch<AuthUser>('/user', 'PUT', { password }, accessToken)
}

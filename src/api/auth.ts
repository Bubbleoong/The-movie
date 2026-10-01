import { apiClient } from './client'

export type AuthUser = { id: string; email: string | null }

export async function currentUser(): Promise<AuthUser | null> {
  const response = await apiClient.get<{ data: AuthUser | null }>('/auth/me')
  return response.data.data
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiClient.post<{ data: AuthUser }>('/auth/login', { email, password })
  return response.data.data
}

export async function signup(email: string, password: string): Promise<{ requiresEmailConfirmation: boolean }> {
  const response = await apiClient.post<{ data: { requiresEmailConfirmation: boolean } }>('/auth/signup', { email, password })
  return response.data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/auth/recover', { email })
}

export async function completePasswordReset(tokens: { tokenHash: string | null; accessToken: string | null }, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { ...tokens, password })
}

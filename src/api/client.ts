import axios from 'axios'
import type { AxiosError } from 'axios'

type ServerError = { error?: { code?: string; message?: string } }

export class ApiClientError extends Error {
  readonly code: string
  readonly status: number | null

  constructor(code: string, status: number | null, message: string) {
    super(message)
    this.code = code
    this.status = status
  }
}

// Browser API calls go through our server; session tokens remain in HttpOnly cookies.
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10_000,
})

apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError<ServerError>) => {
    const status = error.response?.status ?? null
    const code = error.response?.data?.error?.code ?? 'NETWORK_ERROR'
    const message = error.response?.data?.error?.message ?? 'ไม่สามารถติดต่อ server ได้'
    return Promise.reject(new ApiClientError(code, status, message))
  },
)

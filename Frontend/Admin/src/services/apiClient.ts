/**
 * Centralized API Client for Livwee Admin Frontend
 * Auto-configures JSON headers, credentials (cookies), and fallback handling
 */

const API_URL = import.meta.env.VITE_API_URL || ''
const BASE_URL = API_URL ? `${API_URL.replace(/\/$/, '')}/api` : '/api'

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Send & store HTTP-only cookies
  }

  try {
    const res = await fetch(url, config)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || `API Request failed with status ${res.status}`)
    }

    return data as T
  } catch (error: any) {
    console.warn(`[API Client Warning] ${url}:`, error.message || error)
    throw error
  }
}

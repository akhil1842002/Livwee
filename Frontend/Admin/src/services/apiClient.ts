/**
 * Centralized API Client for Livwee Admin Frontend
 * Auto-configures JSON headers, credentials (cookies), and fallback handling
 */

const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD || isVercel ? 'https://livwee.onrender.com' : '')
const BASE_URL = API_URL ? `${API_URL.replace(/\/$/, '')}/api` : '/api'

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const token = typeof window !== 'undefined' ? (localStorage.getItem('livwee-token') || localStorage.getItem('medikit-token')) : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {})
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Send & store HTTP-only cookies
  }

  try {
    const res = await fetch(url, config)
    const text = await res.text()
    let data: any = {}

    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(`Server returned invalid response from ${url} (Status: ${res.status})`)
    }

    if (!res.ok) {
      throw new Error(data.message || `API Request failed with status ${res.status}`)
    }

    return data as T
  } catch (error: any) {
    console.warn(`[API Client Warning] ${url}:`, error.message || error)
    throw error
  }
}

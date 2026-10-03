/**
 * Centralized API Client for Livwee Admin Frontend
 * Auto-configures JSON headers, credentials (cookies), and fallback handling.
 * Features:
 *  1. In-flight promise deduplication for concurrent GET calls.
 *  2. Short-lived memory caching (4s TTL) for GET responses to prevent StrictMode & re-render duplicates.
 *  3. Short-lived error caching (4s TTL) for GET failures to eliminate offline duplicate network errors.
 *  4. Automatic cache invalidation on mutations (POST, PUT, DELETE).
 */

const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD || isVercel ? 'https://livwee.onrender.com' : '')
const BASE_URL = API_URL ? `${API_URL.replace(/\/$/, '')}/api` : '/api'

interface CacheEntry {
  data?: any
  error?: any
  timestamp: number
}

// In-flight request cache to deduplicate concurrent duplicate GET requests
const inFlightRequests = new Map<string, Promise<any>>()

// Short-lived response and error cache for GET requests (4 seconds TTL)
const responseCache = new Map<string, CacheEntry>()
const errorCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 4000

export function clearApiCache() {
  responseCache.clear()
  errorCache.clear()
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { forceFetch?: boolean } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
  const requestKey = `${method}:${url}`

  // On write operations (POST, PUT, DELETE, PATCH), invalidate all caches
  if (method !== 'GET') {
    responseCache.clear()
    errorCache.clear()
  }

  // 1. Check successful response cache for GET requests
  if (method === 'GET' && !options.forceFetch) {
    const cached = responseCache.get(requestKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Promise.resolve(cached.data as T)
    }

    // 2. Check error cache for recently failed GET requests (prevents offline request duplication)
    const cachedErr = errorCache.get(requestKey)
    if (cachedErr && Date.now() - cachedErr.timestamp < CACHE_TTL_MS) {
      return Promise.reject(cachedErr.error)
    }
  }

  // 3. Deduplicate concurrent in-flight GET requests
  if (method === 'GET' && inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey) as Promise<T>
  }

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

  const requestPromise = (async () => {
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

      // Store successful GET response in cache
      if (method === 'GET') {
        responseCache.set(requestKey, { data, timestamp: Date.now() })
        errorCache.delete(requestKey)
      }

      return data as T
    } catch (error: any) {
      if (method === 'GET') {
        errorCache.set(requestKey, { error, timestamp: Date.now() })
      }
      console.warn(`[API Client Warning] ${url}:`, error.message || error)
      throw error
    } finally {
      if (method === 'GET') {
        inFlightRequests.delete(requestKey)
      }
    }
  })()

  if (method === 'GET') {
    inFlightRequests.set(requestKey, requestPromise)
  }

  return requestPromise
}

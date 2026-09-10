# Authentication Integration
> Paste into Claude/ChatGPT: "Integrate this auth flow into Orbit's SignInPage.tsx and SignUpPage.tsx"

## Current State
Auth pages (`src/pages/auth/SignInPage.tsx`, `SignUpPage.tsx`, `ForgotPasswordPage.tsx`) use a fake timeout to simulate sign-in. Replace with real calls.

## JWT Auth (Recommended)
### Backend contract
```typescript
// POST /auth/sign-in
// Body: { email: string, password: string }
// Response:
interface SignInResponse {
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    role: 'admin' | 'user'
  }
  token: string        // JWT
  refreshToken: string
  expiresAt: number    // Unix timestamp
}
```

### Integration
Create `src/hooks/useAuth.ts`:
```typescript
import { useState, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

interface AuthUser { id: string; name: string; email: string; role: string }

const AuthContext = createContext<{
  user: AuthUser | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}>(null!)

export function useAuth() { return useContext(AuthContext) }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('orbit_user')
    return stored ? JSON.parse(stored) : null
  })
  const navigate = useNavigate()

  const signIn = async (email: string, password: string) => {
    const { data } = await api.post('/auth/sign-in', { email, password })
    localStorage.setItem('orbit_token', data.token)
    localStorage.setItem('orbit_user', JSON.stringify(data.user))
    setUser(data.user)
    navigate('/dashboard')
  }

  const signOut = () => {
    localStorage.removeItem('orbit_token')
    localStorage.removeItem('orbit_user')
    setUser(null)
    navigate('/sign-in')
  }

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>
}
```

### Update SignInPage.tsx
Replace the `handleSubmit` function:
```typescript
const { signIn } = useAuth()
const [error, setError] = useState('')

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  const form = new FormData(e.currentTarget)
  try {
    await signIn(form.get('email') as string, form.get('password') as string)
  } catch (err) {
    setError('Invalid email or password')
  } finally {
    setLoading(false)
  }
}
```

## OAuth (GitHub / Google)
```typescript
// Redirect to backend OAuth handler
const handleOAuth = (provider: 'github' | 'google') => {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}`
}
// After OAuth redirect back, your backend sets a cookie or calls window.postMessage with the token
```

## Protected Routes
Wrap main routes in a guard in `src/App.tsx`:
```typescript
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}

// Then in routes:
<Route element={<RequireAuth><Layout /></RequireAuth>}>
```

## Supabase Auth (Alternative)
```bash
npm install @supabase/supabase-js
```
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
// signIn: supabase.auth.signInWithPassword({ email, password })
// signOut: supabase.auth.signOut()
// user: supabase.auth.getUser()
```

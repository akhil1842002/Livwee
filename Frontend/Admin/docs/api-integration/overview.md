# Orbit Dashboard — API Integration Guide
> **LLM-ready:** Paste this file (and any specific endpoint files) into Claude or ChatGPT with your request. The structure is designed for AI-assisted integration.

## What This Guide Covers
Orbit ships as a pure frontend template with mock data. This guide explains how to replace mock data with real API calls.

## Project Structure
```
src/
├── data/            ← Mock data (replace these with API calls)
│   ├── dashboard.ts ← statsData, revenueData, transactions, activityFeed
│   ├── contacts.ts  ← contacts[]
│   ├── billing.ts   ← currentPlan, plans, invoices
│   └── messages.ts  ← conversations, initialMessages
├── pages/           ← Pages consume data from src/data/ or via hooks
├── hooks/           ← Add your data-fetching hooks here
└── types/index.ts   ← All TypeScript types — match your API responses to these
```

## Recommended Integration Pattern

### 1. Add a fetching library
```bash
npm install @tanstack/react-query axios
```

### 2. Create an API client
Create `src/lib/api.ts`:
```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // Set in .env.local
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach auth token from localStorage/cookie
api.interceptors.request.use(config => {
  const token = localStorage.getItem('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### 3. Wrap your app with QueryClient
In `src/main.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()
// wrap <App /> with <QueryClientProvider client={queryClient}>
```

### 4. Replace mock data with hooks
Example for the Dashboard page:
```typescript
// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/analytics/stats').then(r => r.data),
    staleTime: 5 * 60 * 1000,  // 5 minutes
  })
}
```

Then in `DashboardPage.tsx`, replace:
```typescript
import { statsData } from '@/data/dashboard'  // ← remove
const { data: statsData, isLoading } = useDashboardStats()  // ← add
```

## Environment Variables
Create `.env.local` in the project root:
```
VITE_API_URL=https://your-api.com/v1
VITE_APP_NAME=Orbit
```

## Authentication Flow
See [authentication.md](./authentication.md) for the full auth integration guide.

## Files to Read for Each Integration
| Feature | Read these files |
|---|---|
| Dashboard charts | `src/pages/dashboard/DashboardPage.tsx`, `src/data/dashboard.ts`, `src/types/index.ts` |
| CRM Contacts | `src/pages/crm/ContactsPage.tsx`, `src/data/contacts.ts`, `src/types/index.ts` (Contact interface) |
| Billing | `src/pages/billing/BillingPage.tsx`, `src/data/billing.ts` |
| AI Chat | `src/pages/ai/ChatPage.tsx`, `src/data/messages.ts` |
| Auth | `src/pages/auth/SignInPage.tsx`, `src/pages/auth/SignUpPage.tsx` |

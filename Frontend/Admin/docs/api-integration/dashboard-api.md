# Dashboard & Analytics API Integration
> Paste into Claude/ChatGPT with your backend framework to generate the API endpoints and React hooks.

## TypeScript Interfaces (from src/types/index.ts)
```typescript
interface StatCardData {
  id: string
  label: string
  value: string
  change: number          // percentage change (positive or negative)
  changeLabel: string
  sparkData: { value: number }[]
}

interface Transaction {
  id: string
  customer: string
  email: string
  initials: string
  date: string
  type: string
  amount: number
  status: 'completed' | 'pending' | 'failed' | 'refunded'
}
```

## API Endpoints Required
```
GET /analytics/stats          → StatCardData[]
GET /analytics/revenue?period=7D|30D|90D|1Y  → { month: string, revenue: number, expenses: number }[]
GET /analytics/traffic        → { name: string, value: number, color: string }[]
GET /transactions?limit=10    → Transaction[]
GET /activity?limit=5         → ActivityFeedItem[]
```

## React Query Hooks (create in src/hooks/useDashboard.ts)
```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StatCardData, Transaction } from '@/types'

export const useDashboardStats = () =>
  useQuery<StatCardData[]>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/analytics/stats').then(r => r.data),
    staleTime: 60_000,
  })

export const useRevenue = (period: '7D' | '30D' | '90D' | '1Y') =>
  useQuery({
    queryKey: ['analytics', 'revenue', period],
    queryFn: () => api.get(`/analytics/revenue?period=${period}`).then(r => r.data),
    staleTime: 5 * 60_000,
  })

export const useTransactions = (limit = 10) =>
  useQuery<Transaction[]>({
    queryKey: ['transactions', limit],
    queryFn: () => api.get(`/transactions?limit=${limit}`).then(r => r.data),
    staleTime: 30_000,
  })
```

## DashboardPage.tsx changes
Replace static imports at the top of the file:
```typescript
// Before:
import { statsData, revenueData, transactions, activityFeed } from '@/data/dashboard'

// After:
import { useDashboardStats, useRevenue, useTransactions } from '@/hooks/useDashboard'

// In component:
const { data: statsData = [], isLoading: statsLoading } = useDashboardStats()
const { data: revenueData = [] } = useRevenue(period)
const { data: transactions = [] } = useTransactions()
```

Add loading states:
```typescript
// Wrap StatCard grid with loading skeleton:
{statsLoading ? (
  <div className="grid grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-40 bg-orbit-surface rounded-xl animate-pulse border border-orbit-border" />
    ))}
  </div>
) : (
  <div className="grid grid-cols-4 gap-4">
    {statsData.map((stat, i) => <StatCard key={stat.id} data={stat} index={i} />)}
  </div>
)}
```

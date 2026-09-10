import { IndianRupee, Users, TrendingUp, RotateCcw, PackageCheck, AlertCircle, ShoppingBag, CreditCard } from 'lucide-react'

export interface RevenueMetric {
  month: string
  revenue: number
  expenses: number
  refunds: number
}

export interface PaymentBreakdown {
  name: string
  value: number
  color: string
}

export const revenueData: RevenueMetric[] = [
  { month: 'Jan', revenue: 42000, expenses: 28000, refunds: 450 },
  { month: 'Feb', revenue: 53000, expenses: 31000, refunds: 620 },
  { month: 'Mar', revenue: 48000, expenses: 29000, refunds: 380 },
  { month: 'Apr', revenue: 71000, expenses: 35000, refunds: 890 },
  { month: 'May', revenue: 64000, expenses: 32000, refunds: 510 },
  { month: 'Jun', revenue: 89000, expenses: 38000, refunds: 720 },
  { month: 'Jul', revenue: 95000, expenses: 41000, refunds: 980 },
  { month: 'Aug', revenue: 108000, expenses: 44000, refunds: 810 },
  { month: 'Sep', revenue: 148590, expenses: 52000, refunds: 255 },
]

export const paymentMethodData: PaymentBreakdown[] = [
  { name: 'UPI Payment', value: 42, color: '#7C3AED' },
  { name: 'Cash', value: 28, color: '#10B981' },
  { name: 'Credit Card', value: 18, color: '#06B6D4' },
  { name: 'Bank Transfer / NEFT', value: 8, color: '#F59E0B' },
  { name: 'Clinic Credit (Net 30)', value: 4, color: '#6366F1' },
]

export const dashboardKpis = [
  {
    id: 'gross-sales',
    label: 'Gross Sales Revenue',
    value: '₹1,48,590.00',
    change: 14.2,
    changeLabel: 'vs last month',
    subtext: 'Total billing across POS & Invoices',
    icon: IndianRupee,
    color: 'emerald',
  },
  {
    id: 'returns-refunds',
    label: 'Customer Returns & Refunds',
    value: '₹255.00',
    change: -12.4,
    changeLabel: '0.17% return rate',
    subtext: '2 Customer refunds processed',
    icon: RotateCcw,
    color: 'purple',
  },
  {
    id: 'collections',
    label: 'Payments Collected',
    value: '₹12,640.00',
    change: 8.5,
    changeLabel: 'Cash, UPI & NEFT',
    subtext: 'Settled against open bills',
    icon: CreditCard,
    color: 'accent',
  },
  {
    id: 'receivables',
    label: 'Outstanding Receivables',
    value: '₹1,582.00',
    change: -5.1,
    changeLabel: 'Due credit balance',
    subtext: 'St. Jude Hospital & Clinic credit',
    icon: AlertCircle,
    color: 'warning',
  },
]

export interface ReturnSummary {
  id: string
  returnNumber: string
  customer: string
  item: string
  qty: number
  reason: string
  disposition: 'RESTOCK' | 'QUARANTINE' | 'DESTROY'
  refundAmount: number
  method: string
  status: 'REFUNDED' | 'APPROVED'
  date: string
}

export const recentReturnsSummary: ReturnSummary[] = [
  {
    id: '1',
    returnNumber: 'RET-2026-001',
    customer: 'Anita Sharma',
    item: 'Azithromycin 500mg Tablets',
    qty: 1,
    reason: 'Physician changed prescription dosage',
    disposition: 'RESTOCK',
    refundAmount: 120.00,
    method: 'UPI',
    status: 'REFUNDED',
    date: '2026-09-08'
  },
  {
    id: '2',
    returnNumber: 'RET-2026-002',
    customer: 'Walk-in Customer',
    item: 'Cough Syrup 100ml',
    qty: 1,
    reason: 'Damaged outer box seal',
    disposition: 'QUARANTINE',
    refundAmount: 135.00,
    method: 'Cash',
    status: 'APPROVED',
    date: '2026-09-08'
  }
]

export const activityFeed = [
  { id: '1', text: 'POS Sale INV-2026-0042 completed (₹140.00 via Cash)', time: '10 min ago', type: 'success', initials: 'POS' },
  { id: '2', text: 'St. Jude Hospital paid ₹10,000.00 partial credit (REC-2026-001)', time: '2 hours ago', type: 'upgrade', initials: 'REC' },
  { id: '3', text: 'Customer return RET-2026-001 refunded ₹120.00 via UPI', time: '4 hours ago', type: 'warning', initials: 'RET' },
  { id: '4', text: 'FEFO Alert: Batch BAT-2026-088 expiring in 14 days', time: '6 hours ago', type: 'info', initials: 'FEFO' },
  { id: '5', text: 'Purchase Order PO-2026-004 received from Cipla Ltd', time: '1 day ago', type: 'milestone', initials: 'PO' },
]


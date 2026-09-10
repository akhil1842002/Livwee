import type { Invoice } from '@/types'

export const currentPlan = {
  name: 'Pro',
  price: 299,
  period: 'month',
  renewsAt: 'Jul 21, 2026',
  features: ['Unlimited projects', 'Up to 25 team members', '100GB storage', 'Priority support', 'Advanced analytics'],
  usage: {
    apiCalls: { used: 847230, limit: 1000000, label: 'API Calls' },
    storage: { used: 62.4, limit: 100, label: 'Storage (GB)' },
    seats: { used: 14, limit: 25, label: 'Team Seats' },
    projects: { used: 8, limit: null, label: 'Projects' },
  },
}

export const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    period: 'month',
    description: 'Perfect for individuals and small teams',
    features: ['5 projects', 'Up to 3 team members', '10GB storage', 'Email support', 'Basic analytics'],
    cta: 'Downgrade',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299,
    period: 'month',
    description: 'For growing teams that need more power',
    features: ['Unlimited projects', 'Up to 25 team members', '100GB storage', 'Priority support', 'Advanced analytics', 'Custom integrations'],
    cta: 'Current Plan',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    period: 'month',
    description: 'For large organizations with custom needs',
    features: ['Everything in Pro', 'Unlimited team members', '1TB storage', 'Dedicated support', 'Custom SLA', 'SSO & SAML', 'Audit logs'],
    cta: 'Upgrade',
    highlight: false,
  },
]

export const invoices: Invoice[] = [
  { id: '1', number: 'INV-2026-0621', date: 'Jun 21, 2026', dueDate: 'Jul 21, 2026', description: 'Pro Plan — Monthly', amount: 299, status: 'paid' },
  { id: '2', number: 'INV-2026-0521', date: 'May 21, 2026', dueDate: 'Jun 21, 2026', description: 'Pro Plan — Monthly', amount: 299, status: 'paid' },
  { id: '3', number: 'INV-2026-0421', date: 'Apr 21, 2026', dueDate: 'May 21, 2026', description: 'Pro Plan — Monthly', amount: 299, status: 'paid' },
  { id: '4', number: 'INV-2026-0321', date: 'Mar 21, 2026', dueDate: 'Apr 21, 2026', description: 'Pro Plan — Monthly + Overage', amount: 347, status: 'paid' },
  { id: '5', number: 'INV-2026-0221', date: 'Feb 21, 2026', dueDate: 'Mar 21, 2026', description: 'Pro Plan — Monthly', amount: 299, status: 'paid' },
  { id: '6', number: 'INV-2026-0121', date: 'Jan 21, 2026', dueDate: 'Feb 21, 2026', description: 'Starter to Pro Upgrade', amount: 250, status: 'paid' },
]

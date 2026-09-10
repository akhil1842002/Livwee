export type Theme = 'dark' | 'light'

export interface NavItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string
  permission?: string
  children?: NavSubItem[]
}

export interface NavSubItem {
  label: string
  href: string
  badge?: string
  permission?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export interface StatCardData {
  id: string
  label: string
  value: string
  change: number
  changeLabel: string
  icon: React.ComponentType<{ className?: string }>
  color: 'primary' | 'accent' | 'success' | 'warning'
  sparkData: { value: number }[]
}

export interface Transaction {
  id: string
  customer: string
  email: string
  avatar?: string
  initials: string
  date: string
  type: string
  amount: number
  status: 'completed' | 'pending' | 'failed' | 'refunded'
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  role: string
  status: 'active' | 'inactive' | 'prospect'
  avatar?: string
  initials: string
  location: string
  lastActivity: string
  tags: string[]
  deals: number
  value: number
}

export interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  description: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'draft'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  unread?: boolean
}

export interface PipelineDeal {
  id: string
  title: string
  company: string
  contact: string
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  probability: number
  closeDate: string
  initials: string
}

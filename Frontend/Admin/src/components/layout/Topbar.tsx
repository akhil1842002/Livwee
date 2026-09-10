import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sun, Moon, X, CheckCheck, AlertTriangle, ShoppingBag, ShieldCheck, ArrowRight, Check, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebar } from '@/hooks/useSidebar'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
import { SystemGuideModal } from '@/components/modals/SystemGuideModal'
import { getUserAvatar } from '@/utils/avatarUtils'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'POS Terminal (FEFO)',
  '/catalog/products': 'Product Catalog',
  '/catalog/categories': 'Categories',
  '/catalog/brands': 'Brands',
  '/catalog/units': 'Units',
  '/catalog/taxes': 'Tax Configurations',
  '/inventory/stock': 'Current Stock',
  '/inventory/batches': 'Product Batches',
  '/inventory/warehouses': 'Warehouses',
  '/inventory/transactions': 'Stock Movements',
  '/purchases/orders': 'Purchase Orders',
  '/purchases/suppliers': 'Suppliers',
  '/sales/history': 'Sales History',
  '/billing/invoices': 'Invoices & Billing',
  '/sales/returns': 'Returns & Refunds',
  '/people/customers': 'Customers Directory',
  '/users': 'User Management',
  '/roles': 'Roles & Permissions',
  '/reports': 'Reports & Exports',
  '/audit-logs': 'Audit Trail',
  '/settings': 'System Settings'
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'warning' | 'success' | 'info' | 'critical'
  read: boolean
  link?: string
}

const DEFAULT_NOTIFS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Low Stock Warning',
    message: 'Amoxicillin 500mg (Batch #BAT-902) stock level is low (4 units left).',
    time: '5 mins ago',
    type: 'warning',
    read: false,
    link: '/inventory/stock'
  },
  {
    id: 'n2',
    title: 'POS Order Completed',
    message: 'Sale #ORD-2026-104 completed for ₹1,450.00 via UPI payment.',
    time: '18 mins ago',
    type: 'success',
    read: false,
    link: '/sales/history'
  },
  {
    id: 'n3',
    title: 'Purchase Order Delivered',
    message: 'PO #PO-2026-012 from Sun Pharma marked as RECEIVED.',
    time: '1 hour ago',
    type: 'info',
    read: false,
    link: '/purchases/orders'
  },
  {
    id: 'n4',
    title: 'System Security Log',
    message: 'Super Admin profile session accessed from IP 127.0.0.1.',
    time: '2 hours ago',
    type: 'critical',
    read: true,
    link: '/audit-logs'
  }
]

const NOTIFS_STORAGE_KEY = 'medikit-notifications-list'

export function Topbar() {
  const { toggle: toggleSidebar } = useSidebar()
  const { theme, toggle: toggleTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifs, setShowNotifs] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(NOTIFS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFS
  })

  const [avatarUrl, setAvatarUrl] = useState<string>(() => getUserAvatar(user?.email))

  useEffect(() => {
    const syncAvatar = () => setAvatarUrl(getUserAvatar(user?.email))
    syncAvatar()
    window.addEventListener('medikit-avatar-changed', syncAvatar)
    window.addEventListener('storage', syncAvatar)
    return () => {
      window.removeEventListener('medikit-avatar-changed', syncAvatar)
      window.removeEventListener('storage', syncAvatar)
    }
  }, [user?.email])

  const saveNotifications = (newList: NotificationItem[]) => {
    setNotifications(newList)
    localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(newList))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    saveNotifications(updated)
  }

  const toggleNotifRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = notifications.map(n => n.id === id ? { ...n, read: !n.read } : n)
    saveNotifications(updated)
  }

  const handleNotifClick = (notif: NotificationItem) => {
    if (!notif.read) {
      const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n)
      saveNotifications(updated)
    }
    if (notif.link) {
      navigate(notif.link)
      setShowNotifs(false)
    }
  }

  const pageTitle = routeLabels[location.pathname] ?? 'Dashboard'

  const quickLinks = [
    { label: 'POS Terminal', path: '/pos' },
    { label: 'Product Catalog', path: '/catalog/products' },
    { label: 'FEFO Product Batches', path: '/inventory/batches' },
    { label: 'Invoices & Billing', path: '/billing/invoices' },
    { label: 'Sales History', path: '/sales/history' },
    { label: 'System Settings', path: '/settings' },
  ].filter(link => link.label.toLowerCase().includes(searchQuery.toLowerCase()) || link.path.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <header className="h-16 border-b border-orbit-border bg-orbit-surface flex items-center px-4 sm:px-6 gap-4 flex-shrink-0 relative transition-colors duration-200">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-orbit-surface2 border border-slate-200/80 dark:border-orbit-border transition-colors shadow-sm cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-slate-900 dark:text-slate-100 font-bold text-base tracking-tight">{pageTitle}</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Quick Search trigger */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orbit-surface2 border border-orbit-border text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs transition-all hover:border-orbit-primary/40 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-orbit-primary-light" />
          <span className="hidden sm:inline">Search portal...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-orbit-surface border border-orbit-border rounded font-mono text-slate-500 dark:text-slate-400">⌘K</kbd>
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(prev => !prev)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-orbit-surface2 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orbit-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orbit-primary ring-2 ring-orbit-surface" />
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          <AnimatePresence>
            {showNotifs && (
              <>
                {/* Click outside backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />

                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface2/40">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orbit-primary-light" />
                      <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-orbit-primary/15 text-orbit-primary-light rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-bold text-orbit-primary-light hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-orbit-border">
                    {notifications.length > 0 ? (
                      notifications.map(n => {
                        const Icon =
                          n.type === 'warning' ? AlertTriangle :
                          n.type === 'success' ? ShoppingBag :
                          n.type === 'critical' ? ShieldCheck : Bell

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={cn(
                              'p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-orbit-surface2/60 transition-colors cursor-pointer relative group',
                              !n.read && 'bg-orbit-primary/5 dark:bg-orbit-primary/10'
                            )}
                          >
                            <div className={cn(
                              'p-2 rounded-xl flex-shrink-0 mt-0.5',
                              n.type === 'warning' && 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                              n.type === 'success' && 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                              n.type === 'critical' && 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
                              n.type === 'info' && 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn('text-xs font-bold truncate', n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-extrabold')}>
                                  {n.title}
                                </p>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 font-mono">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                            </div>

                            <button
                              onClick={(e) => toggleNotifRead(n.id, e)}
                              title={n.read ? 'Mark as unread' : 'Mark as read'}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-orbit-primary-light transition-opacity cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-orbit-primary absolute top-4 right-3" />
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        No notifications right now.
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t border-slate-100 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface2/40 flex items-center justify-between">
                    <button
                      onClick={() => { navigate('/audit-logs'); setShowNotifs(false) }}
                      className="text-xs font-bold text-orbit-primary-light hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View System Audit Trail <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">{notifications.length} alerts</span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-orbit-surface2 transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-orbit-primary-light" />}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-orbit-border">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-orbit-primary flex items-center justify-center text-white text-xs font-bold shadow-md shadow-orbit-primary/30 overflow-hidden ring-1 ring-orbit-border hover:opacity-90 hover:scale-105 transition-all cursor-pointer"
            title="Open Profile & Settings"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="DP" className="w-full h-full object-cover" />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : 'A'
            )}
          </button>
        </div>
      </div>

      {/* Search overlay — portalled to body to escape stacking context */}
      {createPortal(
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center pt-20 px-4"
              onClick={() => setShowSearch(false)}
            >
              <motion.div
                initial={{ y: -16, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -16, opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-lg bg-orbit-surface border border-orbit-border rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-orbit-border bg-orbit-surface2/60">
                  <Search className="w-4 h-4 text-orbit-primary-light flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search pages or features..."
                    className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm"
                  />
                  <button onClick={() => setShowSearch(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Quick Page Navigation</p>
                  <div className="space-y-1">
                    {quickLinks.map(item => (
                      <div
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setShowSearch(false)
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-orbit-primary/10 cursor-pointer text-sm text-slate-800 dark:text-slate-200 hover:text-orbit-primary-light transition-colors"
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{item.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* System Guide & Concept Manual Modal */}
      <SystemGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </header>
  )
}

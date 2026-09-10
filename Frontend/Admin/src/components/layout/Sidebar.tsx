import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ShieldCheck, Sparkles, LogOut } from 'lucide-react'
import { cn } from '@/utils/cn'
import { navigation } from '@/data/navigation'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { NavItem } from '@/types'
import { getUserAvatar } from '@/utils/avatarUtils'

const ICON_STYLES: Record<string, { bg: string; text: string; activeBg: string; activeGlow: string }> = {
  'Dashboard': {
    bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    activeBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(99,102,241,0.4)]'
  },
  'POS Terminal': {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]'
  },
  'Master Setup': {
    bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    activeBg: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]'
  },
  'Product Catalog': {
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]'
  },
  'Purchasing': {
    bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    activeBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]'
  },
  'Stock Management': {
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(59,130,246,0.4)]'
  },
  'Sales & Invoices': {
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    activeBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]'
  },
  'Customers': {
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(168,85,247,0.4)]'
  },
  'Users & Roles': {
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500/20',
    text: 'text-sky-600 dark:text-sky-400',
    activeBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(14,165,233,0.4)]'
  },
  'Reports & Exports': {
    bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400',
    activeBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(20,184,166,0.4)]'
  },
  'Audit Trail': {
    bg: 'bg-red-500/10 text-red-600 dark:text-red-400 group-hover:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    activeBg: 'bg-gradient-to-br from-red-500 to-rose-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]'
  },
  'System Settings': {
    bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    activeBg: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]'
  }
}

function LivweeLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="h-16 flex items-center gap-3 px-4 border-b border-orbit-border flex-shrink-0 bg-orbit-surface/80 backdrop-blur-md relative overflow-hidden">
      <div className="relative flex-shrink-0 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orbit-primary via-orbit-primary-light to-orbit-primary flex items-center justify-center shadow-lg shadow-orbit-primary/30 group-hover:scale-105 transition-transform duration-200">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -inset-1 rounded-xl bg-orbit-primary/20 blur-md -z-10 group-hover:bg-orbit-primary/30 transition-colors" />
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex items-center gap-2"
          >
            <div className="flex flex-col">
              <span className="text-slate-900 dark:text-slate-100 font-extrabold text-lg tracking-tight leading-none">
                Livwee
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                Pharma ERP
              </span>
            </div>
            <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orbit-primary/15 text-orbit-primary dark:text-orbit-primary-light border border-orbit-primary/30 shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> PRO
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavItemLink({
  item,
  collapsed,
  isOpen,
  onToggle,
  onNavClick,
  onSingleNavClick,
}: {
  item: NavItem
  collapsed: boolean
  isOpen: boolean
  onToggle: () => void
  onNavClick: () => void
  onSingleNavClick: () => void
}) {
  const location = useLocation()
  const { hasPermission } = useAuth()

  const hasChildren = item.children && item.children.length > 0
  const isActive = item.href ? location.pathname === item.href : false
  const isChildActive = item.children?.some(c => location.pathname === c.href) ?? false

  const colorConfig = ICON_STYLES[item.label] || {
    bg: 'bg-orbit-primary/10 text-orbit-primary-light',
    text: 'text-orbit-primary-light',
    activeBg: 'bg-orbit-primary text-white',
    activeGlow: 'shadow-[0_0_12px_rgba(99,102,241,0.4)]'
  }

  if (item.permission && !hasPermission(item.permission)) {
    return null
  }

  if (hasChildren) {
    const visibleChildren = item.children!.filter(c => !c.permission || hasPermission(c.permission))
    if (visibleChildren.length === 0) return null

    return (
      <div className="relative group/parent">
        <button
          onClick={onToggle}
          title={collapsed ? item.label : undefined}
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group relative',
            isChildActive
              ? 'text-slate-900 dark:text-slate-100 bg-orbit-primary/10 border border-orbit-primary/20 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
          )}
        >
          {item.icon && (
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                isChildActive
                  ? cn(colorConfig.activeBg, colorConfig.activeGlow, 'scale-105')
                  : cn(colorConfig.bg, 'group-hover:scale-105')
              )}
            >
              <item.icon className="w-4 h-4" />
            </div>
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 text-left truncate tracking-wide"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </motion.div>
          )}
        </button>

        {/* Collapsed Tooltip */}
        {collapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/parent:opacity-100 transition-all duration-200 z-50 whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
            {item.label}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orbit-primary/30 text-orbit-primary-light font-mono">
              {visibleChildren.length}
            </span>
          </div>
        )}

        <AnimatePresence>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-5 mt-1 border-l-2 border-orbit-border/80 pl-3 space-y-1">
                {visibleChildren.map(child => (
                  <NavLink
                    key={child.href}
                    to={child.href}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 relative group/child',
                        isActive
                          ? 'text-orbit-primary dark:text-orbit-primary-light font-bold bg-orbit-primary/10 border border-orbit-primary/20 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-all duration-200',
                            isActive
                              ? 'bg-orbit-primary scale-125 shadow-[0_0_6px_rgba(99,102,241,0.6)]'
                              : 'bg-slate-300 dark:bg-slate-600 group-hover/child:bg-slate-500'
                          )}
                        />
                        <span className="truncate">{child.label}</span>
                        {child.badge && (
                          <span className="ml-auto text-[9px] font-black bg-orbit-primary/20 text-orbit-primary-light px-1.5 py-0.2 rounded-full border border-orbit-primary/30">
                            {child.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="relative group/single">
      <NavLink
        to={item.href!}
        onClick={() => {
          onSingleNavClick()
          onNavClick()
        }}
        title={collapsed ? item.label : undefined}
        className={({ isActive: routerActive }) => {
          const active = routerActive || isActive
          return cn(
            'flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group relative',
            active
              ? 'text-slate-900 dark:text-slate-100 bg-orbit-primary/10 border border-orbit-primary/20 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
          )
        }}
      >
        {({ isActive: routerActive }) => {
          const active = routerActive || isActive
          return (
            <>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-orbit-primary to-orbit-primary-light rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                />
              )}
              {item.icon && (
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    active
                      ? cn(colorConfig.activeBg, colorConfig.activeGlow, 'scale-105')
                      : cn(colorConfig.bg, 'group-hover:scale-105')
                  )}
                >
                  <item.icon className="w-4 h-4" />
                </div>
              )}
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="truncate tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className="ml-auto text-[9px] font-black bg-orbit-primary/20 text-orbit-primary-light px-1.5 py-0.2 rounded-full border border-orbit-primary/30">
                  {item.badge}
                </span>
              )}
            </>
          )
        }}
      </NavLink>

      {/* Collapsed Tooltip */}
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/single:opacity-100 transition-all duration-200 z-50 whitespace-nowrap border border-slate-700">
          {item.label}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { collapsed, isMobile, mobileOpen, closeMobile } = useSidebar()
  const { user, logout, hasPermission } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  // Dynamic navigation filtering based on active user permissions
  const visibleNavigation = useMemo(() => {
    return navigation.map(section => {
      const visibleItems = section.items.map(item => {
        if (item.children && item.children.length > 0) {
          const visibleChildren = item.children.filter(child => {
            return !child.permission || hasPermission(child.permission)
          })
          const isParentAllowed = (!item.permission || hasPermission(item.permission)) && visibleChildren.length > 0
          if (isParentAllowed) {
            return { ...item, children: visibleChildren }
          }
          return null
        }

        const isAllowed = !item.permission || hasPermission(item.permission)
        return isAllowed ? item : null
      }).filter(Boolean) as typeof section.items

      return { ...section, items: visibleItems }
    }).filter(section => section.items.length > 0)
  }, [hasPermission, user])

  // Track single open parent menu item for accordion behavior
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

  const [openParent, setOpenParent] = useState<string | null>(() => {
    for (const section of navigation) {
      for (const item of section.items) {
        if (item.children?.some(c => location.pathname === c.href)) {
          return item.label
        }
      }
    }
    return null
  })

  // Synchronize open parent item when route changes
  useEffect(() => {
    let matchedParent: string | null = null
    for (const section of navigation) {
      for (const item of section.items) {
        if (item.children?.some(c => location.pathname === c.href)) {
          matchedParent = item.label
          break
        }
      }
    }
    setOpenParent(matchedParent)
  }, [location.pathname])

  const toggleParent = (label: string) => {
    setOpenParent(prev => (prev === label ? null : label))
  }

  const handleSingleNavClick = () => {
    setOpenParent(null)
  }

  const onNavClick = () => {
    if (isMobile) closeMobile()
  }

  const handleLogout = async () => {
    await logout()
    showToast('You have been signed out.', 'info')
    navigate('/sign-in')
  }

  return (
    <motion.aside
      animate={{
        width: isMobile ? 256 : (collapsed ? 72 : 256),
        x: isMobile && !mobileOpen ? '-100%' : 0,
      }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`fixed left-0 top-0 h-screen bg-orbit-surface border-r border-orbit-border flex flex-col ${isMobile ? 'z-40' : 'z-30'} overflow-hidden shadow-2xl transition-colors duration-200`}
    >
      <LivweeLogo collapsed={collapsed && !isMobile} />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1">
        {visibleNavigation.map(section => (
          <div key={section.title} className="space-y-1">
            {section.items.map(item => (
              <NavItemLink
                key={item.label}
                item={item}
                collapsed={collapsed && !isMobile}
                isOpen={openParent === item.label}
                onToggle={() => toggleParent(item.label)}
                onNavClick={onNavClick}
                onSingleNavClick={handleSingleNavClick}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User Profile Card Footer */}
      <div className="border-t border-orbit-border p-3 bg-orbit-surface2/60 backdrop-blur-sm">
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-xl bg-orbit-surface border border-orbit-border shadow-sm group/user transition-all duration-200 hover:border-orbit-primary/40',
          collapsed && !isMobile && 'justify-center p-1.5'
        )}>
          <div
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            title="Open Account & Profile Settings"
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orbit-primary to-orbit-primary-light flex items-center justify-center text-white text-xs font-black shadow-md shadow-orbit-primary/30 overflow-hidden ring-1 ring-orbit-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.name ? user.name.charAt(0).toUpperCase() : 'A'
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-orbit-surface shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>

            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={user?.name || 'Super Admin'}>
                    {user?.name || 'Super Admin'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-1.5 py-0.2 text-[9px] bg-orbit-primary/15 text-orbit-primary-light font-mono font-bold rounded uppercase tracking-wider truncate">
                      {user?.type || 'SUPER_ADMIN'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={user?.email || 'admin@livwee.com'}>
                    {user?.email || 'admin@livwee.com'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {(!collapsed || isMobile) && (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

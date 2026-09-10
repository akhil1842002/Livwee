import { useState, createContext, useContext, useEffect } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  isMobile: boolean
  mobileOpen: boolean
  closeMobile: () => void
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  isMobile: false,
  mobileOpen: false,
  closeMobile: () => {},
})

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggle = () => {
    if (isMobile) {
      setMobileOpen(o => !o)
    } else {
      setCollapsed(c => !c)
    }
  }

  return {
    collapsed,
    toggle,
    isMobile,
    mobileOpen,
    closeMobile: () => setMobileOpen(false),
  }
}

export function useSidebar() {
  return useContext(SidebarContext)
}

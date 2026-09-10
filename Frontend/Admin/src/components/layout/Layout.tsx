import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Footer } from './Footer'
import { SidebarContext, useSidebarState } from '@/hooks/useSidebar'
import { ErrorBoundary } from '@/components/ui'

export function Layout() {
  const sidebarState = useSidebarState()
  const location = useLocation()

  return (
    <SidebarContext.Provider value={sidebarState}>
      <div className="flex h-screen bg-orbit-bg text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
        {/* Ambient Glows (Dark Mode Only) */}
        <div className="fixed inset-0 pointer-events-none z-0 hidden dark:block">
          <div className="absolute top-0 left-1/4 w-[500px] h-[350px] bg-orbit-primary/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-orbit-primary/10 blur-[100px] rounded-full" />
        </div>

        <Sidebar />

        {/* Mobile backdrop */}
        <AnimatePresence>
          {sidebarState.isMobile && sidebarState.mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-35"
              onClick={sidebarState.closeMobile}
            />
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <motion.div
          animate={{
            marginLeft: sidebarState.isMobile ? 0 : (sidebarState.collapsed ? 72 : 256),
          }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative z-20"
        >
          <Topbar />

          {/* Scrollable Main Viewport */}
          <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-5 flex flex-col justify-between space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 w-full max-w-full"
              >
                <ErrorBoundary key={location.pathname}>
                  <Outlet />
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
            <Footer />
          </main>
        </motion.div>
      </div>
    </SidebarContext.Provider>
  )
}

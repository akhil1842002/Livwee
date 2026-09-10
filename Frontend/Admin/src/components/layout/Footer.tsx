export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/50 dark:border-orbit-border/30 py-3 px-2 mt-auto text-xs text-slate-400 dark:text-slate-500 transition-colors">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left branding */}
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center flex-wrap gap-1.5">
          <span>&copy; {currentYear}</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Livwee</span>
          <span className="text-orbit-primary-light font-extrabold tracking-tight">Admin</span>
          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
          <span className="text-slate-400 dark:text-slate-500 font-medium">Enterprise Healthcare & Pharmacy ERP</span>
        </p>

        {/* Right status & version badges */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-orbit-surface2 border border-slate-200/50 dark:border-orbit-border/50 font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold shadow-2xs">
            v2.0 Enterprise
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            System Online
          </div>
        </div>
      </div>
    </footer>
  )
}

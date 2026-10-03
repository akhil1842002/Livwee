import React from 'react'
import { Loader2 } from 'lucide-react'

interface PageLoaderProps {
  message?: string
  subtext?: string
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Loading data...',
  subtext = 'Fetching latest records from server...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] p-8 space-y-4 w-full">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-orbit-primary/10 border border-orbit-primary/20 flex items-center justify-center shadow-inner animate-pulse">
          <Loader2 className="w-6 h-6 text-orbit-primary dark:text-orbit-primary-light animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">{message}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtext}</p>
      </div>
    </div>
  )
}

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="w-full space-y-3 p-4 animate-pulse">
      <div className="h-9 bg-slate-200 dark:bg-orbit-surface2 rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-orbit-border/60">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-slate-200 dark:bg-orbit-surface2 rounded-lg ${
                j === 0 ? 'w-1/4' : j === columns - 1 ? 'w-1/6' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
